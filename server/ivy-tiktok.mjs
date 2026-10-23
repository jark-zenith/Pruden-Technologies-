import { createHash, createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const API = "https://open.tiktokapis.com";
const TABLE = "pruden_tiktok_connections";
function configured() {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REDIRECT_URI && process.env.IVY_TOKEN_ENCRYPTION_KEY && process.env.COMMAND_ACCESS_SECRET);
}
function admin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("TikTok storage is not configured: Supabase service-role credentials are missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function encryptionKey() {
  const raw = process.env.IVY_TOKEN_ENCRYPTION_KEY || "";
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("IVY_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes (64 hex characters or base64).");
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
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.encrypted_tokens, "base64")), decipher.final()]).toString("utf8"));
}
function signedState(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", process.env.COMMAND_ACCESS_SECRET).update(data).digest("base64url");
  return data + "." + sig;
}
function readState(value) {
  const [data, signature, extra] = String(value || "").split(".");
  if (!data || !signature || extra) throw new Error("Invalid OAuth state.");
  const expected = createHmac("sha256", process.env.COMMAND_ACCESS_SECRET).update(data).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("OAuth state signature did not match.");
  const state = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  if (!Number.isFinite(state.issuedAt) || Date.now() - state.issuedAt > 10 * 60 * 1000 || state.issuedAt > Date.now() + 30000) throw new Error("OAuth state expired. Start the connection again.");
  return state;
}
async function getConnection(accountId) {
  const { data, error } = await admin().from(TABLE).select("*").eq("account_id", accountId).maybeSingle();
  if (error) throw error;
  return data;
}
async function saveTokens(state, tokenData) {
  const db = admin();
  const encrypted = encrypt(tokenData);
  const row = { owner_id: state.ownerId, account_id: state.accountId, ...encrypted, scopes: String(tokenData.scope || "").split(",").filter(Boolean), open_id: tokenData.open_id || null, expires_at: new Date(Date.now() + Number(tokenData.expires_in || 0) * 1000).toISOString(), refresh_expires_at: tokenData.refresh_expires_in ? new Date(Date.now() + Number(tokenData.refresh_expires_in) * 1000).toISOString() : null, updated_at: new Date().toISOString() };
  const { error } = await db.from(TABLE).upsert(row, { onConflict: "account_id" });
  if (error) throw error;
}
async function tokenFor(row) {
  let tokens = decrypt(row);
  if (Date.parse(row.expires_at) < Date.now() + 60000) {
    const form = new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: tokens.refresh_token });
    const response = await fetch(API + "/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const data = await response.json();
    if (!response.ok || data.error || !data.access_token) throw new Error("TikTok token refresh failed. Reconnect the account in PTMS.");
    tokens = { ...tokens, ...data };
    await saveTokens({ ownerId: row.owner_id, accountId: row.account_id }, tokens);
  }
  return tokens.access_token;
}
async function apiGet(path, token, params) {
  const url = new URL(API + path);
  url.searchParams.set("fields", params);
  const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  const data = await response.json();
  if (!response.ok || data.error?.code && data.error.code !== "ok") throw new Error("TikTok API request failed: " + String(data.error?.message || response.statusText).slice(0, 240));
  return data.data || {};
}
export function registerTikTokRoutes(app) {
  app.get("/api/social/tiktok/status", async (_req, res) => {
    try {
      if (!configured()) return res.json({ configured: false, connected: false, message: "Add TikTok OAuth credentials and token encryption configuration to the private backend environment." });
      const accountId = String(_req.query.accountId || "");
      if (accountId) {
        const row = await getConnection(accountId);
        if (row) return res.json({ configured: true, connected: true, handle: row.display_name || row.open_id || "Authorized TikTok account", scopes: row.scopes || [] });
      }
      const { data, error } = await admin().from(TABLE).select("account_id,display_name,open_id,scopes").limit(20);
      if (error) throw error;
      const row = (data || [])[0];
      res.json({ configured: true, connected: Boolean(row), handle: row?.display_name || row?.open_id || null, scopes: row?.scopes || [] });
    } catch (error) { res.status(500).json({ configured: configured(), connected: false, error: "Could not read TikTok connection status.", detail: String(error?.message || "").slice(0, 200) }); }
  });
  app.get("/api/social/tiktok/connect", async (req, res) => {
    try {
      if (!configured()) return res.status(503).json({ error: "TikTok API credentials are not configured on the private backend." });
      const accountId = String(req.query.accountId || "");
      if (!/^[0-9a-f-]{36}$/i.test(accountId)) return res.status(400).json({ error: "Select a valid TikTok account record first." });
      const db = admin();
      const { data: account, error } = await db.from("pruden_social_accounts").select("id,owner_id,platform").eq("id", accountId).maybeSingle();
      if (error) throw error;
      if (!account || account.platform !== "TikTok") return res.status(404).json({ error: "TikTok account record was not found." });
      const state = signedState({ accountId: account.id, ownerId: account.owner_id, issuedAt: Date.now(), nonce: randomBytes(16).toString("hex") });
      const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
      url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "user.info.basic,user.info.profile,user.info.stats,video.list");
      url.searchParams.set("redirect_uri", process.env.TIKTOK_REDIRECT_URI);
      url.searchParams.set("state", state);
      res.redirect(302, url.toString());
    } catch (error) { res.status(500).json({ error: "Could not start TikTok authorization.", detail: String(error?.message || "").slice(0, 180) }); }
  });
  app.get("/api/social/tiktok/callback", async (req, res) => {
    try {
      if (!configured()) return res.status(503).send("TikTok connection is not configured on the backend.");
      if (req.query.error) return res.status(400).send("TikTok authorization was cancelled or denied. Return to PTMS and try again.");
      const state = readState(req.query.state);
      const code = String(req.query.code || "");
      if (!code) return res.status(400).send("TikTok did not return an authorization code.");
      const form = new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, code, grant_type: "authorization_code", redirect_uri: process.env.TIKTOK_REDIRECT_URI });
      const response = await fetch(API + "/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      const data = await response.json();
      if (!response.ok || data.error || !data.access_token) return res.status(502).send("TikTok token exchange failed. Check app approval, redirect URI and server logs; no token was stored.");
      await saveTokens(state, data);
      const who = await apiGet("/v2/user/info/", data.access_token, "open_id,display_name,username,follower_count,following_count,likes_count,video_count");
      const profile = who.user || {};
      const { error } = await admin().from(TABLE).update({ display_name: profile.display_name || profile.username || null, updated_at: new Date().toISOString() }).eq("account_id", state.accountId);
      if (error) throw error;
      res.status(200).type("html").send("<!doctype html><html><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>TikTok connected</title><body style=\"font:16px system-ui;background:#08111f;color:#edf4ff;padding:40px\"><h1>TikTok authorization complete</h1><p>Return to PTMS. The connection is read-only; publishing and comment actions remain disabled.</p><a style=\"color:#83c9ff\" href=\"/\">Return to PRUDEN Command</a></body></html>");
    } catch (error) { res.status(400).send("TikTok authorization could not be completed. " + String(error?.message || "Check backend configuration.").slice(0, 180)); }
  });
  app.post("/api/social/tiktok/sync", async (_req, res) => {
    try {
      const db = admin();
      const { data: rows, error: lookupError } = await db.from(TABLE).select("*").order("updated_at", { ascending: false }).limit(1);
      if (lookupError) throw lookupError;
      const row = rows?.[0];
      if (!row) return res.status(409).json({ error: "Connect a TikTok account before syncing metrics." });
      const token = await tokenFor(row);
      const profileData = await apiGet("/v2/user/info/", token, "open_id,display_name,username,follower_count,following_count,likes_count,video_count");
      const user = profileData.user || {};
      const videosResponse = await fetch(API + "/v2/video/list/?fields=id,title,video_description,create_time,view_count,like_count,comment_count,share_count", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ max_count: 20 }) });
      const videoData = await videosResponse.json();
      if (!videosResponse.ok || videoData.error?.code && videoData.error.code !== "ok") throw new Error("TikTok video metrics request failed: " + String(videoData.error?.message || videosResponse.statusText).slice(0, 200));
      const values = [
        ["Followers", user.follower_count], ["Following", user.following_count], ["Lifetime likes", user.likes_count], ["Video count", user.video_count]
      ].filter(([, value]) => value !== undefined && value !== null);
      for (const [key, value] of values) {
        const { error } = await db.from("pruden_social_metrics").insert({ owner_id: row.owner_id, account_id: row.account_id, metric_key: key, metric_value: String(value), note: "TikTok API sync; read-only profile data." });
        if (error) throw error;
      }
      const videos = videoData.data?.videos || [];
      for (const video of videos) {
        for (const [key, value] of [["Video views", video.view_count], ["Video likes", video.like_count], ["Video comments", video.comment_count], ["Video shares", video.share_count]]) {
          if (value === undefined || value === null) continue;
          const { error } = await db.from("pruden_social_metrics").insert({ owner_id: row.owner_id, account_id: row.account_id, metric_key: key, metric_value: String(value), note: "TikTok API sync; video " + String(video.id || "").slice(0, 80) + (video.title ? "; " + String(video.title).slice(0, 100) : "") });
          if (error) throw error;
        }
      }
      await db.from(TABLE).update({ display_name: user.display_name || user.username || row.display_name, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("account_id", row.account_id);
      res.json({ ok: true, metricsSaved: values.length + videos.length * 4, videosRead: videos.length, profile: { display_name: user.display_name || user.username || null } });
    } catch (error) { res.status(502).json({ error: "TikTok sync failed. Confirm the app's approved scopes, access token, API quota and service configuration.", detail: String(error?.message || "").slice(0, 220) }); }
  });
}
