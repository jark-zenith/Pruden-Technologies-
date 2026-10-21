const searchWindows = new Map();
const MAX_QUERY_LENGTH = 180;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

function takeRateLimit(ip) {
  const now = Date.now();
  const recent = (searchWindows.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  searchWindows.set(ip, recent);
  if (searchWindows.size > 2000) {
    for (const [key, times] of searchWindows) {
      if (!times.some((time) => now - time < WINDOW_MS)) searchWindows.delete(key);
    }
  }
  return true;
}

function safeText(value, max = 500) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch { return ""; }
}

async function searchBrave(query) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return { configured: false, results: [] };
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("safesearch", "strict");
  const response = await fetch(url, { headers: { "Accept": "application/json", "X-Subscription-Token": key }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(response.status === 429 ? "Web search quota is temporarily exhausted. Try again later." : "The web search provider is temporarily unavailable.");
  const payload = await response.json();
  const results = (Array.isArray(payload.web?.results) ? payload.web.results : []).slice(0, 8).map((item) => ({
    title: safeText(item.title, 220),
    url: safeHttpsUrl(item.url),
    snippet: safeText(item.description, 420),
    source: safeText(item.profile?.long_name || item.profile?.name || "", 100),
  })).filter((item) => item.title && item.url);
  return { configured: true, results };
}

async function searchYouTube(query) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { configured: false, results: [] };
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("q", query);
  url.searchParams.set("key", key);
  const response = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(response.status === 403 ? "YouTube API access or quota is unavailable. Check the YouTube Data API v3 settings." : "YouTube search is temporarily unavailable.");
  const payload = await response.json();
  const results = (Array.isArray(payload.items) ? payload.items : []).slice(0, 8).map((item) => {
    const videoId = typeof item.id?.videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(item.id.videoId) ? item.id.videoId : "";
    return {
      videoId,
      title: safeText(item.snippet?.title, 220),
      url: videoId ? "https://www.youtube.com/watch?v=" + videoId : "",
      snippet: safeText(item.snippet?.description, 420),
      source: safeText(item.snippet?.channelTitle, 100),
      thumbnail: safeHttpsUrl(item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ""),
    };
  }).filter((item) => item.videoId && item.title && item.url);
  return { configured: true, results };
}

export function registerIvyMediaRoutes(app) {
  app.get("/api/ivy/media/status", (_req, res) => {
    res.json({ configured: Boolean(process.env.BRAVE_SEARCH_API_KEY || process.env.YOUTUBE_API_KEY), providers: { web: Boolean(process.env.BRAVE_SEARCH_API_KEY), youtube: Boolean(process.env.YOUTUBE_API_KEY) } });
  });

  app.post("/api/ivy/media/search", async (req, res) => {
    const ip = req.ip || "unknown";
    if (!takeRateLimit(ip)) return res.status(429).json({ error: "Media search is limited to 20 requests per minute. Wait a moment and try again." });
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    const kind = req.body?.kind;
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH || /[\u0000-\u001f\u007f]/.test(query)) {
      return res.status(400).json({ error: "Search must be between 2 and 180 characters and contain no control characters." });
    }
    if (kind !== "web" && kind !== "youtube") return res.status(400).json({ error: "Choose either web or youtube search." });
    try {
      const output = kind === "web" ? await searchBrave(query) : await searchYouTube(query);
      if (!output.configured) return res.status(503).json({ error: kind === "web" ? "Web search is not configured. Add BRAVE_SEARCH_API_KEY to the private server environment." : "YouTube search is not configured. Add YOUTUBE_API_KEY to the private server environment." });
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ results: output.results });
    } catch (error) {
      const message = error instanceof Error && /quota|temporarily|unavailable|settings/i.test(error.message) ? error.message : "Search failed safely. Check the provider configuration and server logs.";
      return res.status(502).json({ error: message });
    }
  });
}
