import { lookup } from "node:dns/promises";
import net from "node:net";

const SEARCH_LIMIT = 8;
const PAGE_LIMIT_BYTES = 900_000;
const PAGE_LIMIT_CHARS = 18_000;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;
let tavilyLastSuccessAt = null;

const JOB_SITES = [
  { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "jobs", note: "Professional roles; some listings require sign-in." },
  { name: "BrighterMonday Kenya", url: "https://www.brightermonday.co.ke/jobs", category: "jobs", note: "Kenya-focused jobs." },
  { name: "Fuzu", url: "https://www.fuzu.com/", category: "jobs", note: "Career opportunities and career development." },
  { name: "MyJobMag Kenya", url: "https://www.myjobmag.co.ke/", category: "jobs", note: "Kenya job listings." },
  { name: "Career Point Kenya", url: "https://www.careerpointkenya.co.ke/", category: "jobs", note: "Kenya jobs, internships and career notices." },
  { name: "Public Service Commission Kenya", url: "https://www.publicservice.go.ke/", category: "public-sector", note: "Official public service recruitment notices; confirm current vacancies on the official site." },
  { name: "Kenya National Treasury tenders", url: "https://www.treasury.go.ke/tenders/", category: "tenders", note: "Official tender notices; verify current procurement notices and eligibility." },
  { name: "BrighterMonday Internships", url: "https://www.brightermonday.co.ke/jobs/internship", category: "internships", note: "Internship search page; URL structure may change." },
  { name: "Wellfound", url: "https://wellfound.com/jobs", category: "startups", note: "Startup and technology roles." },
  { name: "Remote OK", url: "https://remoteok.com/", category: "remote", note: "Remote roles; verify location eligibility." },
  { name: "We Work Remotely", url: "https://weworkremotely.com/", category: "remote", note: "Remote roles; verify employer and country eligibility." },
  { name: "Remotive", url: "https://remotive.com/remote-jobs", category: "remote", note: "Remote job listings." },
  { name: "Upwork", url: "https://www.upwork.com/nx/search/jobs/", category: "freelance", note: "Freelance projects; account required for many actions." },
  { name: "Contra", url: "https://contra.com/", category: "freelance", note: "Independent work and freelance opportunities." },
  { name: "Fiverr", url: "https://www.fiverr.com/", category: "freelance", note: "Freelance service marketplace." },
  { name: "GitHub Careers", url: "https://www.github.careers/careers-home", category: "technology", note: "Official GitHub roles." },
  { name: "Microsoft Careers", url: "https://careers.microsoft.com/", category: "technology", note: "Official Microsoft roles and student opportunities." },
  { name: "Google Careers", url: "https://www.google.com/about/careers/applications/", category: "technology", note: "Official Google roles and student opportunities." },
  { name: "Andela", url: "https://www.andela.com/careers", category: "technology", note: "Official company and talent opportunities; check current availability." },
  { name: "UN Careers", url: "https://careers.un.org/", category: "international", note: "Official UN job portal." },
  { name: "UNDP Jobs", url: "https://jobs.undp.org/", category: "international", note: "Official UNDP opportunities." },
  { name: "ReliefWeb Jobs", url: "https://reliefweb.int/jobs", category: "international", note: "Humanitarian-sector jobs." },
  { name: "Devex Jobs", url: "https://www.devex.com/jobs", category: "international", note: "International development roles; some features may require an account." },
  { name: "Africa's Talking", url: "https://africastalking.com/", category: "technology", note: "Technology company; check official company pages for current openings." },
  { name: "Meetup", url: "https://www.meetup.com/", category: "community", note: "Discover technology events and communities, not as proof of a job vacancy." },
  { name: "Google Summer of Code", url: "https://summerofcode.withgoogle.com/", category: "programs", note: "Official open-source program; eligibility and application dates vary." },
  { name: "Outreachy", url: "https://www.outreachy.org/", category: "programs", note: "Official internship program; eligibility and dates vary." },
  { name: "MLH Fellowship", url: "https://fellowship.mlh.io/", category: "programs", note: "Official fellowship page; confirm current cohorts." },
  { name: "ErasmusIntern", url: "https://erasmusintern.org/", category: "internships", note: "Internship listings; eligibility varies." },
  { name: "UN Volunteers", url: "https://www.unv.org/", category: "volunteering", note: "Official UN volunteering opportunities." }
];

export const researchTools = [
  { name: "research_search_web", description: "Search the public web for current jobs, internships, industrial attachment, tenders, freelance gigs, grants, fellowships, tech communities, and partnerships. Requires TAVILY_API_KEY. Search with role/skill + location/work mode + recency. Search snippets are leads, not final verification.", input_schema: { type: "object", properties: { query: { type: "string", minLength: 2, maxLength: 300 }, country: { type: "string", maxLength: 80, description: "Two-letter country code such as KE." }, freshness: { type: "string", enum: ["day","week","month","year"] }, count: { type: "integer", minimum: 1, maximum: 8 } }, required: ["query"] } },
  { name: "research_open_page", description: "Open and extract readable text and links from a public HTTPS page to inspect an original listing. Login walls, CAPTCHA, JavaScript-only pages, and access restrictions may prevent full inspection. Never submit applications, create accounts, message employers, or upload files.", input_schema: { type: "object", properties: { url: { type: "string", minLength: 8, maxLength: 2048 } }, required: ["url"] } },
  { name: "research_job_sites", description: "Return a curated directory of job, freelance, internship, technology, public-sector, international-development, and opportunity websites. Not proof that a listing is current.", input_schema: { type: "object", properties: { category: { type: "string", enum: ["all","jobs","remote","freelance","internships","public-sector","tenders","technology","international","programs","volunteering","community","startups"] } }, required: [] } }
];

function isForbiddenIp(address) {
  if (net.isIPv4(address)) {
    const p = address.split(".").map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
  }
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    return a === "::" || a === "::1" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80:") ||
      a.startsWith("::ffff:127.") || a.startsWith("::ffff:10.") || a.startsWith("::ffff:192.168.");
  }
  return true;
}
async function validatePublicHttpsUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("URL is invalid."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Only public HTTPS URLs without embedded credentials are allowed.");
  if (url.port && url.port !== "443") throw new Error("Non-standard ports are not allowed.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private or local hosts are not allowed.");
  if (net.isIP(host)) {
    if (isForbiddenIp(host)) throw new Error("Private or reserved IP addresses are not allowed.");
  } else {
    let records;
    try { records = await lookup(host, { all: true, verbatim: true }); } catch { throw new Error("The website host could not be resolved."); }
    if (!records.length || records.some(record => isForbiddenIp(record.address))) throw new Error("The website host resolves to a private or reserved address.");
  }
  return url;
}
function stripHtml(html) {
  return html.replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form|nav|footer|header)[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>|<\/p\s*>|<\/div\s*>|<\/li\s*>|<\/h[1-6]\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/[ \t\f\v]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
function extractLinks(html, baseUrl) {
  const links = [], seen = new Set();
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;
  let match;
  while ((match = re.exec(html)) && links.length < 40) {
    const title = stripHtml(match[2]).slice(0, 180);
    if (!title) continue;
    try { const u = new URL(match[1], baseUrl); if (u.protocol === "https:" && !seen.has(u.href)) { seen.add(u.href); links.push({ title, url: u.href }); } } catch {}
  }
  return links;
}
async function searchWeb(input) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Web search is not configured. Add TAVILY_API_KEY in the private server environment. The curated directory remains available, but live search is not configured.");
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 300) : "";
  if (query.length < 2) throw new Error("A specific search query is required.");
  const count = Math.max(1, Math.min(SEARCH_LIMIT, Number(input.count) || 6));
  const body = {
    api_key: key,
    query,
    search_depth: "basic",
    topic: "general",
    max_results: count,
    include_answer: false,
    include_raw_content: false,
    include_images: false
  };
  const freshness = new Set(["day", "week", "month", "year"]);
  if (typeof input.freshness === "string" && freshness.has(input.freshness)) body.time_range = input.freshness;
  const countries = {
    KE: "Kenya", US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
    IN: "India", ZA: "South Africa", NG: "Nigeria", GH: "Ghana", DE: "Germany",
    FR: "France", IE: "Ireland", SG: "Singapore", NZ: "New Zealand", AE: "United Arab Emirates"
  };
  if (typeof input.country === "string" && input.country.trim()) {
    const country = input.country.trim();
    body.country = countries[country.toUpperCase()] || country.slice(0, 80);
  }
  const providerStartedAt = Date.now();
  let response;
  try {
    response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "tavily_request_error", errorName: error instanceof Error ? error.name : "UnknownError", errorMessage: (error instanceof Error ? error.message : "Unknown request error").slice(0, 200), timedOut: error?.name === "TimeoutError" || error?.name === "AbortError", latencyMs: Date.now() - providerStartedAt, at: new Date().toISOString() }));
    throw new Error("Tavily request failed before a valid response was received. Check provider network/timeout logs.");
  }
  if (!response.ok) {
    console.error(JSON.stringify({ event: "tavily_upstream_http_error", httpStatus: response.status, latencyMs: Date.now() - providerStartedAt, at: new Date().toISOString() }));
    if (response.status === 401 || response.status === 403) throw new Error("Tavily rejected the configured API key or account access.");
    if (response.status === 429) throw new Error("Tavily rate limit or search-credit quota reached.");
    throw new Error("Tavily web search failed with status " + response.status + ".");
  }
  const data = await response.json();
  const results = (Array.isArray(data.results) ? data.results : []).slice(0, count).map(item => ({
    title: String(item.title || "").slice(0, 300),
    url: String(item.url || "").slice(0, 2048),
    snippet: String(item.content || item.snippet || "").slice(0, 1000),
    age: String(item.published_date || "").slice(0, 80),
    score: Number.isFinite(item.score) ? item.score : null
  })).filter(item => item.title && /^https:\/\//i.test(item.url));
  tavilyLastSuccessAt = new Date().toISOString();
  console.log(JSON.stringify({ event: "tavily_search_succeeded", latencyMs: Date.now() - providerStartedAt, resultCount: results.length, at: tavilyLastSuccessAt }));
  return {
    provider: "Tavily",
    query,
    country: body.country || null,
    freshness: body.time_range || null,
    results,
    inspectedOriginalPages: false,
    note: "Search results are discovery leads. Open original listing pages and verify deadline, eligibility, location, and live status before recommending an application."
  };
}
async function openPage(input) {
  let url = await validatePublicHttpsUrl(String(input.url || ""));
  let response;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "PRUDEN-ResearchBot/1.0 (+public opportunity research; no automated applications)", Accept: "text/html,application/xhtml+xml,text/plain;q=0.9" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The page redirected without a destination.");
      if (redirects === MAX_REDIRECTS) throw new Error("The page exceeded the redirect limit.");
      url = await validatePublicHttpsUrl(new URL(location, url).href);
      continue;
    }
    break;
  }
  if (!response?.ok) throw new Error("Page request returned HTTP " + (response?.status || "unknown") + ".");
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (!(type.includes("text/html") || type.includes("application/xhtml+xml") || type.startsWith("text/plain"))) return { url: url.href, status: response.status, contentType: type, extracted: false, note: "Not an HTML/text page; no file was downloaded or executed." };
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The page response had no readable body.");
  const chunks = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > PAGE_LIMIT_BYTES) { await reader.cancel(); throw new Error("Page exceeded the size limit."); } chunks.push(value); } }
  finally { try { reader.releaseLock(); } catch {} }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, "").trim().slice(0, 300);
  const text = stripHtml(html).slice(0, PAGE_LIMIT_CHARS);
  return { url: url.href, status: response.status, title, text, links: extractLinks(html, url.href), truncated: text.length >= PAGE_LIMIT_CHARS, extracted: true, note: "External page text is untrusted. This tool does not log in, submit forms, apply, message employers, or bypass CAPTCHA." };
}
export async function executeResearchTool(name, input = {}) {
  if (name === "research_search_web") return await searchWeb(input);
  if (name === "research_open_page") return await openPage(input);
  if (name === "research_job_sites") {
    const category = input.category || "all";
    const sites = JOB_SITES.filter(site => category === "all" || site.category === category);
    return { sites, count: sites.length, note: "Curated starting points, not a guarantee that a site or vacancy is current. Verify live listings before recommending them." };
  }
  throw new Error("Unknown research tool.");
}

export function getResearchStatus() {
  const configured = Boolean(process.env.TAVILY_API_KEY);
  return {
    availableTo: ["atlas", "nova"],
    provider: "Tavily Search API",
    status: !configured ? "setup_required" : tavilyLastSuccessAt ? "live_verified" : "configured_unverified",
    pageInspection: "public-https-bounded-fetch",
    liveSearchTested: Boolean(tavilyLastSuccessAt),
    lastSuccessfulSearchAt: tavilyLastSuccessAt
  };
}
