import test from "node:test";
import assert from "node:assert/strict";
import { researchTools, executeResearchTool } from "./research-web.mjs";

const byName = new Map(researchTools.map(tool => [tool.name, tool]));
test("Atlas research tools expose bounded search, page inspection, and site discovery", () => {
  assert.deepEqual([...byName.keys()], ["research_search_web", "research_open_page", "research_job_sites"]);
  assert.equal(byName.get("research_search_web").input_schema.properties.count.maximum, 8);
  assert.equal(byName.get("research_open_page").input_schema.required[0], "url");
});
test("job-site directory covers major opportunity categories", async () => {
  const result = await executeResearchTool("research_job_sites", { category: "all" });
  assert.ok(result.count >= 20);
  for (const category of ["jobs", "remote", "freelance", "internships", "technology", "international"]) assert.ok(result.sites.some(site => site.category === category), "missing " + category);
  assert.ok(result.sites.every(site => site.url.startsWith("https://")));
});
test("Kenya jobs and internship sources can be filtered", async () => {
  const jobs = await executeResearchTool("research_job_sites", { category: "jobs" });
  assert.ok(jobs.sites.some(site => site.name === "BrighterMonday Kenya"));
  assert.ok((await executeResearchTool("research_job_sites", { category: "internships" })).sites.length > 0);
});
test("live search fails honestly when the Tavily key is missing", async () => {
  const original = process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_API_KEY;
  try { await assert.rejects(() => executeResearchTool("research_search_web", { query: "junior developer jobs Kenya" }), /TAVILY_API_KEY/); }
  finally { if (original !== undefined) process.env.TAVILY_API_KEY = original; }
});
test("live search calls Tavily and normalizes sourced results", async () => {
  const originalKey = process.env.TAVILY_API_KEY;
  const originalFetch = globalThis.fetch;
  let request;
  process.env.TAVILY_API_KEY = "test-key-not-a-real-secret";
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [{ title: "Junior Developer", url: "https://example.com/job", content: "Entry-level role", published_date: "2026-10-20", score: 0.91 }] })
    };
  };
  try {
    const result = await executeResearchTool("research_search_web", { query: "junior developer jobs", country: "KE", freshness: "week", count: 3 });
    assert.equal(request.url, "https://api.tavily.com/search");
    assert.equal(request.options.method, "POST");
    assert.equal(request.body.api_key, "test-key-not-a-real-secret");
    assert.equal(request.body.country, "Kenya");
    assert.equal(request.body.time_range, "week");
    assert.equal(request.body.max_results, 3);
    assert.equal(result.provider, "Tavily");
    assert.equal(result.results[0].url, "https://example.com/job");
    assert.equal(result.results[0].snippet, "Entry-level role");
    assert.equal(result.results[0].age, "2026-10-20");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = originalKey;
  }
});
test("Tavily quota and authentication errors are reported clearly", async () => {
  const originalKey = process.env.TAVILY_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.TAVILY_API_KEY = "test-key";
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try { await assert.rejects(() => executeResearchTool("research_search_web", { query: "internships Kenya" }), /Tavily rate limit or search-credit quota/); }
  finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = originalKey;
  }
});
test("page inspection rejects non-HTTPS and local/private destinations", async () => {
  await assert.rejects(() => executeResearchTool("research_open_page", { url: "http://example.com" }), /HTTPS/);
  await assert.rejects(() => executeResearchTool("research_open_page", { url: "https://127.0.0.1" }), /[Pp]rivate or reserved/);
  await assert.rejects(() => executeResearchTool("research_open_page", { url: "https://localhost" }), /local hosts/);
});
