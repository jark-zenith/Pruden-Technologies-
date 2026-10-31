const MAX_PROMPT_LENGTH = 5000;
const DEFAULT_PROVIDER = (process.env.IMAGE_GENERATION_PROVIDER || "gemini").toLowerCase();
const DEFAULT_GEMINI_MODEL = "gemini-nano-banana-2.1";
const DEFAULT_OPENAI_MODEL = "gpt-image-2.5-flare";

function providerConfig() {
  return {
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_MODEL
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_MODEL
    }
  };
}

export function imageGenerationStatus() {
  const providers = providerConfig();
  const preferred = providers[DEFAULT_PROVIDER]?.configured
    ? DEFAULT_PROVIDER
    : Object.keys(providers).find((name) => providers[name].configured) || DEFAULT_PROVIDER;
  return {
    configured: Object.values(providers).some((provider) => provider.configured),
    provider: preferred,
    model: providers[preferred]?.model || null,
    providers,
    assignedAgents: ["lumi"],
    mode: "image-generation"
  };
}

function dimensionsFor(aspectRatio) {
  const sizes = {
    "1:1": "1024x1024", "3:2": "1536x1024", "2:3": "1024x1536",
    "3:4": "1024x1536", "4:3": "1536x1024", "4:5": "1024x1536",
    "5:4": "1536x1024", "9:16": "1024x1536", "16:9": "1536x1024",
    "21:9": "1536x656"
  };
  return sizes[aspectRatio] || "1024x1024";
}

async function generateGemini({ prompt, aspectRatio, imageSize }) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model,
      input: [{ type: "text", text: prompt }],
      response_format: { type: "image", mime_type: "image/png", aspect_ratio: aspectRatio, image_size: imageSize }
    }),
    signal: AbortSignal.timeout(120000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message.replaceAll(key, "[REDACTED]").slice(0, 220) : "";
    console.warn(JSON.stringify({ event: "workforce_image_provider_error", provider: "gemini", model, httpStatus: response.status, providerMessage: message, at: new Date().toISOString() }));
    throw Object.assign(new Error(response.status === 429 ? "Gemini image quota/rate limit reached." : "Gemini image generation failed. Check provider access and server logs."), { statusCode: response.status === 429 ? 429 : 502 });
  }
  let image = data?.output_image;
  if (!image?.data) {
    for (const step of [...(data?.steps || [])].reverse()) {
      if (step?.type !== "model_output") continue;
      const found = (step.content || []).find(part => part?.type === "image" && typeof part.data === "string");
      if (found) { image = found; break; }
    }
  }
  if (!image?.data || typeof image.data !== "string") throw Object.assign(new Error("Gemini returned no usable image."), { statusCode: 502 });
  return { provider: "gemini", model, mimeType: ["image/png","image/jpeg","image/webp"].includes(image.mime_type) ? image.mime_type : "image/png", imageData: image.data };
}

async function generateOpenAI({ prompt, aspectRatio }) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_MODEL;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({ model, prompt, size: dimensionsFor(aspectRatio), quality: process.env.OPENAI_IMAGE_QUALITY || "medium", output_format: "png", n: 1 }),
    signal: AbortSignal.timeout(120000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message.replaceAll(key, "[REDACTED]").slice(0, 220) : "";
    console.warn(JSON.stringify({ event: "workforce_image_provider_error", provider: "openai", model, httpStatus: response.status, providerMessage: message, at: new Date().toISOString() }));
    throw Object.assign(new Error(response.status === 429 ? "OpenAI image quota/rate limit reached." : "OpenAI image generation failed. Check API access, organization verification, and server logs."), { statusCode: response.status === 429 ? 429 : 502 });
  }
  const imageData = data?.data?.[0]?.b64_json;
  if (typeof imageData !== "string" || !imageData) throw Object.assign(new Error("OpenAI returned no usable image."), { statusCode: 502 });
  return { provider: "openai", model, mimeType: "image/png", imageData };
}

export async function generateWorkforceImage({ agentId, prompt, aspectRatio = "1:1", imageSize = "1K", provider }) {
  if (agentId !== "lumi") throw Object.assign(new Error("Image generation is currently assigned to Lumi only."), { statusCode: 403 });
  if (typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > MAX_PROMPT_LENGTH) {
    throw Object.assign(new Error("Provide an image prompt between 1 and 5000 characters."), { statusCode: 400 });
  }
  if (!["1:1","3:2","2:3","3:4","4:3","4:5","5:4","9:16","16:9","21:9"].includes(aspectRatio)) {
    throw Object.assign(new Error("Unsupported image aspect ratio."), { statusCode: 400 });
  }
  if (!["1K","2K","4K"].includes(imageSize)) throw Object.assign(new Error("Unsupported image size."), { statusCode: 400 });
  const providers = providerConfig();
  const selected = String(provider || DEFAULT_PROVIDER).toLowerCase();
  if (!["gemini","openai"].includes(selected)) throw Object.assign(new Error("Choose a supported image provider."), { statusCode: 400 });
  if (!providers[selected].configured) throw Object.assign(new Error(selected + " image generation is not configured. Add its private API key in Render."), { statusCode: 503 });
  const startedAt = Date.now();
  try {
    const result = selected === "openai"
      ? await generateOpenAI({ prompt: prompt.trim(), aspectRatio })
      : await generateGemini({ prompt: prompt.trim(), aspectRatio, imageSize });
    const latencyMs = Date.now() - startedAt;
    console.log(JSON.stringify({ event: "workforce_image_generated", agentId, provider: result.provider, model: result.model, mimeType: result.mimeType, latencyMs, at: new Date().toISOString() }));
    return { agentId, ...result, latencyMs };
  } catch (error) {
    if (error?.statusCode) throw error;
    console.warn(JSON.stringify({ event: "workforce_image_request_error", agentId, provider: selected, errorName: error instanceof Error ? error.name : "UnknownError", at: new Date().toISOString() }));
    throw Object.assign(new Error("Image generation could not reach the selected provider. Check server network and timeout logs."), { statusCode: 502 });
  }
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
        imageSize: req.body?.imageSize,
        provider: req.body?.provider
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json(result);
    } catch (error) {
      console.warn(JSON.stringify({ event: "workforce_image_generation_failed", status: error.statusCode || 502, at: new Date().toISOString() }));
      return res.status(error.statusCode || 502).json({ error: error.message || "Image generation failed." });
    }
  });
}
