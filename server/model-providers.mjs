const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function getModelProviderStatus() {
  return {
    anthropic: { configured: Boolean(process.env.ANTHROPIC_API_KEY), model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5", supportsWorkforceTools: true },
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL || "gemini-flash-latest", supportsWorkforceTools: false, mode: "text-only fallback until tool-call execution is implemented" },
    textProviderPreference: (process.env.WORKFORCE_TEXT_PROVIDER || "auto").toLowerCase()
  };
}

export async function callGeminiText({ system, task, maxOutputTokens = 1200, model = process.env.GEMINI_MODEL || "gemini-flash-latest" }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("Gemini is not configured. Add GEMINI_API_KEY in the host's private environment settings."), { statusCode: 503 });
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: task }] }],
      generationConfig: { maxOutputTokens }
    }),
    signal: AbortSignal.timeout(45000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const statusCode = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
    const message = response.status === 429
      ? "Gemini quota/rate limit reached. Check Google AI Studio quota or try another configured provider."
      : response.status === 401 || response.status === 403
        ? "Gemini rejected the API key or project access. Check GEMINI_API_KEY and model availability."
        : "Gemini could not complete the request. Check model availability and server logs.";
    throw Object.assign(new Error(message), { statusCode });
  }
  const output = (data.candidates || []).flatMap(candidate => candidate.content?.parts || []).map(part => part.text || "").join("\n").trim();
  if (!output) throw Object.assign(new Error("Gemini returned no text output; the response may have been blocked or empty."), { statusCode: 502 });
  return { output: output.slice(0, 20000), usage: data.usageMetadata || null, model };
}
