import test from "node:test";
import assert from "node:assert/strict";
import { researchTools, executeResearchTool } from "./research-web.mjs";

const byName = new Map(researchTools.map(tool => [tool.name, tool]));

test("Atlas research tools expose bounded search, page inspection, and site discovery", () => {
  assert.deepEqual([...byName.keys()], ["research_search_web", "research_open_page", "research_job_sites"]);
  assert.equal(byName.get("research_search_web").input_schema.properties.count.maximum, 8);
  assert.equal(byName.get("research_open_page").input_schema.required[0], "url");
});

test("job-site directory returns a useful range of opportunity categories", async () => {
  const result = await executeResearchTool("research_job_sites", { category: "all" });
  assert.ok(result.count >= 20);
  for (const category of ["jobs", "remote", "freelance", "internships", "technology", "international"]) {
    assert.ok(result.sites.some(site => site.category === category), "missing category " + category);
  }
  assert.ok(result.sites.every(site => site.url.startsWith("https://")));
});

test("site discovery can filter to Kenya jobs and internships", async () => {
  const jobs = await executeResearchTool("research_job_sites", { category: "jobs" });
  assert.ok(jobs.sites.some(site => site.name === "BrighterMonday Kenya"));
  const internships = await executeResearchTool("research_job_sites", { category: "internships" });
  assert.ok(internships.sites.length > 0);
});

test("live search fails honestly when its API key is not configured", async () => {
  const original = process.env.BRAVE_SEARCH_API_KEY;
  delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    await assert.rejects(() => executeResearchTool("research_search_web", { query: "junior developer jobs Kenya" }), /BRAVE_SEARCH_API_KEY/);
  } finally {
    if (original !== undefined) process.env.BRAVE_SEARCH_API_KEY = original;
  }
});

test("page inspection blocks non-HTTPS and local/private destinations", async () => {
  await assert.rejects(() => executeResearchTool("research_open_page", { url: "http://example.com" }), /HTTPS/);
  await assert.rejects(() => executeResearchTool("research_open_page", { url: "https://127.0.0.1" }), /private or reserved/);
  await assert.rejects(() => executeResearchTool("research_open_page", { url: "https://localhost" }), /local hosts/);
});
