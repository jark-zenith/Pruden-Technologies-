import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const IVY_EMAIL = "ivyassistantai@gmail.com";
const TOKEN_ROW = "ivy-primary";
const STATE_COOKIE = "ivy_gmail_oauth_state";
const TOKEN_TABLE = "ivy_gmail_tokens";

function encryptionKey() {
  const raw = process.env.IVY_TOKEN_ENCRYPTION_KEY || "";
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("IVY_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
  return key;
}
function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { encrypted_tokens: ciphertext.toString("base64"), token_iv: iv.toString("base64"), token_tag: cipher.getAuthTag().toString("base64") };
}
function decrypt(row) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.token_iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.token_tag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(row.encrypted_tokens, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext);
}
function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to securely persist Ivy's Gmail connection.");
  return { url, key };
}
async function dbRequest(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(url + "/rest/v1/" + path, {
    ...options,
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Secure token storage failed (" + response.status + "). Apply the Ivy Gmail token migration and check server configuration.");
  return text ? JSON.parse(text) : null;
}
async function saveTokens(tokens, email) {
  const sealed = encrypt({ ...tokens, email, savedAt: new Date().toISOString() });
  await dbRequest(TOKEN_TABLE + "?id=eq." + encodeURIComponent(TOKEN_ROW), {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(sealed)
  }).then(async () => {
    const rows = await dbRequest(TOKEN_TABLE + "?id=eq." + encodeURIComponent(TOKEN_ROW) + "&select=id");
    if (!rows?.length) await dbRequest(TOKEN_TABLE, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: TOKEN_ROW, ...sealed }) });
  });
}
async function loadTokens() {
  const rows = await dbRequest(TOKEN_TABLE + "?id=eq." + encodeURIComponent(TOKEN_ROW) + "&select=id,encrypted_tokens,token_iv,token_tag");
  return rows?.[0] ? decrypt(rows[0]) : null;
}
async function googleTokenRequest(body) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Google OAuth token exchange failed (" + response.status + "). Check the OAuth client configuration.");
  return data;
}
async function accessToken() {
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) throw new Error("Ivy's Gmail account is not connected yet.");
  if (tokens.access_token && Number(tokens.expiry_date || 0) > Date.now() + 60000) return tokens.access_token;
  const refreshed = await googleTokenRequest({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token"
  });
  const updated = { ...tokens, access_token: refreshed.access_token, expiry_date: Date.now() + Number(refreshed.expires_in || 3600) * 1000 };
  await saveTokens(updated, IVY_EMAIL);
  return updated.access_token;
}
async function gmailApi(path, options = {}) {
  const token = await accessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path, {
    ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error("Gmail API request failed (" + response.status + "): " + (data?.error?.message || "Check Gmail permissions and account connection."));
  return data;
}
function safeMessage(message) {
  const headers = message.payload?.headers || [];
  const header = (name) => headers.find((item) => String(item.name).toLowerCase() === name.toLowerCase())?.value || "";
  return { id: message.id, threadId: message.threadId, from: header("From").slice(0, 500), to: header("To").slice(0, 500), subject: header("Subject").slice(0, 500), date: header("Date").slice(0, 200), snippet: String(message.snippet || "").slice(0, 1200) };
}
function decodePart(part) {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8");
  for (const child of part.parts || []) {
    const result = decodePart(child);
    if (result) return result;
  }
  if (part.mimeType === "text/html" && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}
function mimeMessage({ to, subject, body }) {
  const clean = (value) => String(value || "").replace(/[\r\n]+/g, " ").trim();
  const lines = [
    "To: " + clean(to),
    "Subject: " + clean(subject),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(String(body || ""), "utf8").toString("base64")
  ];
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}
function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}
function setCookie(res, name, value, maxAge) {
  res.setHeader("Set-Cookie", name + "=" + encodeURIComponent(value) + "; Path=/api/ivy/gmail; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge);
}
function statusConfig() {
  return {
    oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
    tokenStoreConfigured: Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.IVY_TOKEN_ENCRYPTION_KEY),
    expectedEmail: IVY_EMAIL
  };
}
export function registerIvyGmailRoutes(app) {
  app.get("/api/ivy/gmail/status", async (_req, res) => {
    const config = statusConfig();
    let connected = false;
    let error = "";
    if (config.tokenStoreConfigured) {
      try { const tokens = await loadTokens(); connected = Boolean(tokens?.refresh_token && tokens.email === IVY_EMAIL); }
      catch (cause) { error = cause instanceof Error ? cause.message : "Could not check secure token storage."; }
    }
    res.json({ ...config, connected, error });
  });

  app.get("/api/ivy/gmail/oauth/start", (_req, res) => {
    const config = statusConfig();
    if (!config.oauthConfigured || !config.tokenStoreConfigured) return res.status(503).json({ error: "Gmail setup is incomplete. Configure Google OAuth and secure Supabase token storage first." });
    const state = randomBytes(32).toString("hex");
    setCookie(res, STATE_COOKIE, state, 600);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  app.get("/api/ivy/gmail/oauth/callback", async (req, res) => {
    const expectedState = cookieValue(req, STATE_COOKIE);
    const receivedState = String(req.query.state || "");
    setCookie(res, STATE_COOKIE, "", 0);
    if (!expectedState || !receivedState || expectedState.length !== receivedState.length || !timingSafeEqual(Buffer.from(expectedState), Buffer.from(receivedState))) return res.status(400).send("Ivy Gmail connection failed: OAuth state validation failed. Return to PRUDEN Command and try again.");
    if (req.query.error) return res.redirect("/?ivyGmail=cancelled");
    try {
      const tokenData = await googleTokenRequest({
        code: String(req.query.code || ""),
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
        grant_type: "authorization_code"
      });
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: "Bearer " + tokenData.access_token } });
      const profile = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok || String(profile.email || "").toLowerCase() !== IVY_EMAIL) return res.status(403).send("Google returned a different account. Ivy can only connect " + IVY_EMAIL + ". No token was saved.");
      const previous = await loadTokens().catch(() => null);
      const tokens = { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token || previous?.refresh_token, expiry_date: Date.now() + Number(tokenData.expires_in || 3600) * 1000 };
      if (!tokens.refresh_token) return res.status(400).send("Google did not return a refresh token. Remove this app's access from your Google Account and reconnect with consent.");
      await saveTokens(tokens, IVY_EMAIL);
      return res.redirect("/?ivyGmail=connected");
    } catch (cause) {
      console.error("Ivy Gmail OAuth callback failed", cause instanceof Error ? cause.message : "unknown error");
      return res.status(502).send("Ivy Gmail connection failed. Check the server configuration and logs, then retry.");
    }
  });

  app.post("/api/ivy/gmail/disconnect", async (_req, res) => {
    try {
      await dbRequest(TOKEN_TABLE + "?id=eq." + encodeURIComponent(TOKEN_ROW), { method: "DELETE" });
      res.json({ connected: false });
    } catch (cause) { res.status(502).json({ error: cause instanceof Error ? cause.message : "Could not disconnect Gmail." }); }
  });

  app.get("/api/ivy/gmail/search", async (req, res) => {
    const q = String(req.query.q || "").trim().slice(0, 300);
    if (!q) return res.status(400).json({ error: "Enter a Gmail search query." });
    try {
      const result = await gmailApi("messages?q=" + encodeURIComponent(q) + "&maxResults=20");
      const messages = await Promise.all((result.messages || []).slice(0, 20).map((item) => gmailApi("messages/" + encodeURIComponent(item.id) + "?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date")));
      res.json({ messages: messages.map(safeMessage), resultSizeEstimate: result.resultSizeEstimate || 0 });
    } catch (cause) { res.status(502).json({ error: cause instanceof Error ? cause.message : "Gmail search failed." }); }
  });

  app.get("/api/ivy/gmail/messages/:id", async (req, res) => {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(req.params.id)) return res.status(400).json({ error: "Invalid message ID." });
    try {
      const message = await gmailApi("messages/" + encodeURIComponent(req.params.id) + "?format=full");
      res.json({ ...safeMessage(message), body: decodePart(message.payload).slice(0, 30000) });
    } catch (cause) { res.status(502).json({ error: cause instanceof Error ? cause.message : "Could not read this email." }); }
  });

  app.post("/api/ivy/gmail/drafts", async (req, res) => {
    const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    if (!to || to.length > 500 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: "Enter a valid recipient email address." });
    if (!subject || subject.length > 500 || !body.trim() || body.length > 20000) return res.status(400).json({ error: "Subject and message body are required; maximum body length is 20,000 characters." });
    try {
      const raw = mimeMessage({ to, subject, body });
      const draft = await gmailApi("drafts", { method: "POST", body: JSON.stringify({ message: { raw } }) });
      res.json({ id: draft.id, messageId: draft.message?.id, to, subject, created: true });
    } catch (cause) { res.status(502).json({ error: cause instanceof Error ? cause.message : "Could not save the draft." }); }
  });

  app.post("/api/ivy/gmail/send", async (req, res) => {
    if (req.body?.explicitConfirmation !== "SEND EMAIL") return res.status(403).json({ error: 'Sending is blocked until the founder types the exact confirmation phrase "SEND EMAIL".' });
    const draftId = typeof req.body?.draftId === "string" ? req.body.draftId : "";
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(draftId)) return res.status(400).json({ error: "Choose a valid saved draft to send." });
    try {
      const sent = await gmailApi("drafts/send", { method: "POST", body: JSON.stringify({ id: draftId }) });
      res.json({ sent: true, id: sent.id, threadId: sent.threadId, message: "Gmail accepted the send request." });
    } catch (cause) { res.status(502).json({ error: cause instanceof Error ? cause.message : "Gmail could not send the draft." }); }
  });
}
