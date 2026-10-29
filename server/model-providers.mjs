const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function getModelProviderStatus() {
  return {
    anthropic: { configured: Boolean(process.env.ANTHROPIC_API_KEY), model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5", supportsWorkforceTools: true },
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL || "gemini-flash-latest", supportsWorkforceTools: false, mode: "text-only fallback until tool-call execution is implemented" },
    textProviderPreference: (process.env.WORKFORCE_TEXT_PROVIDER || "auto").toLowerCase()
  };
}

export async function callGeminiText({ system, task, maxOutputTokens = 1200, model = process.env.GEMINI_MODEL || "gemini-flash-latest" }) {
  const startedAt = Date.now();
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("Gemini is not configured. Add GEMINI_API_KEY in the host's private environment settings."), { statusCode: 503 });
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: task }] }],
        generationConfig: { maxOutputTokens }
      }),
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    // Log only provider metadata and the error class/message; never log the API key or request body.
    console.error(JSON.stringify({
      event: "gemini_upstream_request_error",
      model,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: (error instanceof Error ? error.message : "Unknown request error").slice(0, 240),
      timedOut: error?.name === "TimeoutError" || error?.name === "AbortError",
      at: new Date().toISOString()
    }));
    throw Object.assign(new Error("Gemini request failed before a valid response was received. Check network/timeout diagnostics in server logs."), { statusCode: 502 });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = data?.error || {};
    console.error(JSON.stringify({
      event: "gemini_upstream_http_error",
      model,
      httpStatus: response.status,
      providerStatus: typeof providerError.status === "string" ? providerError.status : null,
      providerMessage: typeof providerError.message === "string" ? providerError.message.slice(0, 300) : null,
      at: new Date().toISOString()
    }));
    const statusCode = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
    const message = response.status === 429
      ? "Gemini quota/rate limit reached. Check Google AI Studio quota or try another configured provider."
      : response.status === 401 || response.status === 403
        ? "Gemini rejected the API key or project access. Check GEMINI_API_KEY and model availability."
        : "Gemini could not complete the request. Check model availability and server logs.";
    throw Object.assign(new Error(message), { statusCode });
  }
  const output = (data.candidates || []).flatMap(candidate => candidate.content?.parts || []).map(part => part.text || "").join("\n").trim();
  if (!output) {
    console.warn(JSON.stringify({ event: "gemini_empty_output", model, latencyMs: Date.now() - startedAt, finishReason: data?.candidates?.[0]?.finishReason || null, at: new Date().toISOString() }));
    throw Object.assign(new Error("Gemini returned no text output; the response may have been blocked or empty."), { statusCode: 502 });
  }
  console.log(JSON.stringify({ event: "gemini_request_succeeded", model, latencyMs: Date.now() - startedAt, promptTokens: Number(data?.usageMetadata?.promptTokenCount || 0), outputTokens: Number(data?.usageMetadata?.candidatesTokenCount || 0), at: new Date().toISOString() }));
  return { output: output.slice(0, 20000), usage: data.usageMetadata || null, model };
}
