const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;
const MAX_PROMPT_LENGTH = 5000;
const IMAGE_API = "https://generativelanguage.googleapis.com/v1beta/interactions";

function allowedRequest(req) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  attempts.set(ip, recent);
  return true;
}

export function registerLumiImageRoutes(app) {
  app.get("/api/workforce/image/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      provider: "google-gemini",
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
      capability: "image-generation",
      owner: "lumi"
    });
  });

  app.post("/api/workforce/image/generate", async (req, res) => {
    if (!allowedRequest(req)) return res.status(429).json({ error: "Image generation is limited to 3 requests per minute. Please wait and try again." });
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const aspectRatio = typeof req.body?.aspectRatio === "string" ? req.body.aspectRatio : "1:1";
    const allowedRatios = new Set(["1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "16:9", "9:16", "21:9"]);
    if (prompt.length < 8 || prompt.length > MAX_PROMPT_LENGTH || /[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]/.test(prompt)) {
      return res.status(400).json({ error: "Describe the image in 8 to 5,000 characters." });
    }
    if (!allowedRatios.has(aspectRatio)) return res.status(400).json({ error: "Choose a supported image aspect ratio." });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(503).json({ configured: false, error: "Image generation is not configured. Add GEMINI_API_KEY to the private Render environment." });

    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
    const startedAt = Date.now();
    try {
      const response = await fetch(IMAGE_API, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          model,
          input: [{ type: "text", text: "You are Lumi, Creative Director of Pruden Studios. Create a polished, original visual asset from this brief. Respect brand and licensing constraints. Do not add printer marks or claim physical production.\n\n" + prompt }],
          response_format: { type: "image", mime_type: "image/png", aspect_ratio: aspectRatio, image_size: "1K" }
        }),
        signal: AbortSignal.timeout(90000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const providerMessage = typeof data?.error?.message === "string" ? data.error.message.replaceAll(key, "[REDACTED]").slice(0, 240) : "";
        console.warn(JSON.stringify({ event: "lumi_image_provider_error", model, httpStatus: response.status, providerMessage, at: new Date().toISOString() }));
        const status = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
        const message = response.status === 429
          ? "Google image-generation quota or rate limit reached. Check Google AI Studio billing and quota."
          : response.status === 401 || response.status === 403
            ? "Google rejected the image-generation key or project access. Check Gemini API access."
            : "Google image generation failed. Check model availability and server logs.";
        return res.status(status).json({ configured: true, error: message });
      }
      const image = data?.output_image;
      const imageData = typeof image?.data === "string" ? image.data : "";
      const mimeType = typeof image?.mime_type === "string" && image.mime_type.startsWith("image/") ? image.mime_type : "image/png";
      if (!imageData || imageData.length > 12_000_000) {
        console.warn(JSON.stringify({ event: "lumi_image_empty_output", model, latencyMs: Date.now() - startedAt, at: new Date().toISOString() }));
        return res.status(502).json({ configured: true, error: "The image model returned no usable image. Try a clearer or simpler brief." });
      }
      console.log(JSON.stringify({ event: "lumi_image_generated", model, latencyMs: Date.now() - startedAt, imageBytes: Math.floor(imageData.length * 0.75), at: new Date().toISOString() }));
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ success: true, agent: "lumi", provider: "google-gemini", model, mimeType, imageData, latencyMs: Date.now() - startedAt });
    } catch (error) {
      console.warn(JSON.stringify({ event: "lumi_image_request_failed", model, errorName: error instanceof Error ? error.name : "UnknownError", at: new Date().toISOString() }));
      return res.status(502).json({ configured: true, error: "Image generation request failed before a usable result was received. Check Render logs and provider availability." });
    }
  });
}
