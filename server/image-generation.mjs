const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const MAX_PROMPT_LENGTH = 5000;

export function imageGenerationStatus() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    provider: "google-gemini",
    model: process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL,
    assignedAgents: ["lumi"],
    mode: "image-generation"
  };
}

export async function generateWorkforceImage({ agentId, prompt, aspectRatio = "1:1", imageSize = "1K" }) {
  if (agentId !== "lumi") throw Object.assign(new Error("Image generation is currently assigned to Lumi only."), { statusCode: 403 });
  if (typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > MAX_PROMPT_LENGTH) {
    throw Object.assign(new Error("Provide an image prompt between 1 and 5000 characters."), { statusCode: 400 });
  }
  if (!["1:1","3:2","2:3","3:4","4:3","4:5","5:4","9:16","16:9","21:9"].includes(aspectRatio)) {
    throw Object.assign(new Error("Unsupported image aspect ratio."), { statusCode: 400 });
  }
  if (!["1K","2K","4K"].includes(imageSize)) throw Object.assign(new Error("Unsupported image size."), { statusCode: 400 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("Image generation is not configured. Add GEMINI_API_KEY to the private PTMS server environment."), { statusCode: 503 });
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model,
        input: [{ type: "text", text: prompt.trim() }],
        response_format: { type: "image", mime_type: "image/png", aspect_ratio: aspectRatio, image_size: imageSize }
      }),
      signal: AbortSignal.timeout(120000)
    });
  } catch (error) {
    console.warn(JSON.stringify({ event: "workforce_image_request_error", agentId, model, errorName: error instanceof Error ? error.name : "UnknownError", at: new Date().toISOString() }));
    throw Object.assign(new Error("Gemini image generation could not reach the provider. Check server network and timeout logs."), { statusCode: 502 });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = typeof data?.error?.message === "string" ? data.error.message.replaceAll(key, "[REDACTED]").slice(0, 220) : "";
    console.warn(JSON.stringify({ event: "workforce_image_provider_error", agentId, model, httpStatus: response.status, providerMessage, at: new Date().toISOString() }));
    const statusCode = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
    throw Object.assign(new Error(response.status === 429 ? "Gemini image-generation quota or rate limit reached." : response.status === 401 || response.status === 403 ? "Gemini rejected the key or image-model access. Check the private key and model availability." : "Gemini image generation failed. Check provider model access and server logs."), { statusCode });
  }
  let image = data?.output_image;
  if (!image?.data) {
    for (const step of [...(data?.steps || [])].reverse()) {
      if (step?.type !== "model_output") continue;
      const found = (step.content || []).find(part => part?.type === "image" && typeof part.data === "string");
      if (found) { image = found; break; }
    }
  }
  if (!image?.data || typeof image.data !== "string") {
    console.warn(JSON.stringify({ event: "workforce_image_empty_output", agentId, model, latencyMs: Date.now() - startedAt, at: new Date().toISOString() }));
    throw Object.assign(new Error("Gemini responded but did not return an image. Check model output and response format."), { statusCode: 502 });
  }
  const mimeType = ["image/png","image/jpeg","image/webp"].includes(image.mime_type) ? image.mime_type : "image/png";
  console.log(JSON.stringify({ event: "workforce_image_generated", agentId, model, mimeType, latencyMs: Date.now() - startedAt, at: new Date().toISOString() }));
  return { agentId, provider: "google-gemini", model, mimeType, imageData: image.data, latencyMs: Date.now() - startedAt };
}

const generationAttempts = new Map();
export function registerImageGenerationRoutes(app) {
  app.get("/api/workforce/image-status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(imageGenerationStatus());
  });
  app.post("/api/workforce/generate-image", async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const recent = (generationAttempts.get(ip) || []).filter(time => now - time < 60_000);
    if (recent.length >= 5) return res.status(429).json({ error: "Image generation limit reached. Wait one minute before generating another image." });
    recent.push(now); generationAttempts.set(ip, recent);
    try {
      const result = await generateWorkforceImage({
        agentId: typeof req.body?.agentId === "string" ? req.body.agentId : "",
        prompt: req.body?.prompt,
        aspectRatio: req.body?.aspectRatio,
        imageSize: req.body?.imageSize
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json(result);
    } catch (error) {
      console.warn(JSON.stringify({ event: "workforce_image_generation_failed", status: error.statusCode || 502, at: new Date().toISOString() }));
      return res.status(error.statusCode || 502).json({ error: error.message || "Image generation failed." });
    }
  });
}
