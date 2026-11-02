import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const table = "pruden_ivy_calls";
const callStatuses = new Set(["queued", "initiated", "ringing", "in-progress", "completed", "busy", "failed", "no-answer", "canceled"]);

function clean(value, max, label) {
  if (typeof value !== "string") throw new Error(label + " must be text.");
  const result = value.trim();
  if (!result || result.length > max) throw new Error(label + " must be between 1 and " + max + " characters.");
  return result;
}
function xml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Server-side Supabase service-role configuration is required for secure call records.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.IVY_OWNER_PHONE &&
    process.env.TWILIO_VOICE_WEBHOOK_SECRET
  );
}
function signedCallToken(callId) {
  return createHmac("sha256", process.env.TWILIO_VOICE_WEBHOOK_SECRET || "").update(callId).digest("hex");
}
function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || !/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
function validateTwilioRequest(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const supplied = req.get("X-Twilio-Signature") || "";
  if (!authToken || !supplied) return false;
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;
  let data = url;
  for (const key of Object.keys(req.body || {}).sort()) {
    const value = req.body[key];
    if (Array.isArray(value)) for (const item of value) data += key + String(item);
    else data += key + String(value ?? "");
  }
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function verifyWebhook(req) {
  const callId = typeof req.query.callId === "string" ? req.query.callId : "";
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(callId)) return false;
  return safeEqualHex(token, signedCallToken(callId)) && validateTwilioRequest(req);
}
function xmlResponse(res, body, status = 200) {
  res.status(status).type("text/xml").send('<?xml version="1.0" encoding="UTF-8"?><Response>' + body + "</Response>");
}
function webhookUrl(req, endpoint, callId) {
  const token = signedCallToken(callId);
  return req.protocol + "://" + req.get("host") + "/api/ivy/twilio/" + endpoint + "?callId=" + encodeURIComponent(callId) + "&token=" + token;
}
async function updateCall(callId, patch) {
  const client = serviceClient();
  const { data, error } = await client.from(table).update(patch).eq("id", callId).select("id,status,twilio_call_sid,callback_digit,updated_at").maybeSingle();
  if (error) throw new Error("Call record update failed.");
  return data;
}
async function getCall(callId) {
  const client = serviceClient();
  const { data, error } = await client.from(table).select("id,title,summary,severity,status,twilio_call_sid,callback_digit").eq("id", callId).maybeSingle();
  if (error) throw new Error("Call record could not be read.");
  return data;
}

export function ivyTwilioCapabilityStatus() {
  const configured = twilioConfigured();
  return {
    status: configured ? "configured_unverified" : "setup_required",
    provider: "Twilio Programmable Voice",
    outboundCalls: configured ? "configured_unverified" : "not_available",
    destinationPolicy: "fixed IVY_OWNER_PHONE only",
    webhookSecurity: "Twilio request signature plus application HMAC token",
    liveConversation: "not_implemented",
    callHistory: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) ? "database_required_and_migration_pending_or_applied" : "service_role_key_required"
  };
}

export function registerIvyTwilioWebhookRoutes(app) {
  app.post("/api/ivy/twilio/voice", async (req, res) => {
    if (!verifyWebhook(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    try {
      const call = await getCall(req.query.callId);
      if (!call) return xmlResponse(res, "<Say>This Ivy call is no longer available.</Say><Hangup/>", 404);
      const gather = '<Gather input="dtmf" numDigits="1" timeout="8" action="' + xml(webhookUrl(req, "response", call.id)) + '" method="POST"><Say>' + xml("Hello. This is Ivy from PRUDEN Technologies. " + call.title + ". " + call.summary + ". Press 1 to acknowledge this update, or press 2 to hear it again.") + "</Say></Gather>";
      return xmlResponse(res, gather + "<Say>I did not receive a keypad response. I have recorded the call outcome. Goodbye.</Say><Hangup/>");
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_voice_webhook_error", message: error instanceof Error ? error.message : "unknown" }));
      return xmlResponse(res, "<Say>I could not load the PTMS update. Please check the workspace.</Say><Hangup/>", 500);
    }
  });

  app.post("/api/ivy/twilio/response", async (req, res) => {
    if (!verifyWebhook(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    const digit = typeof req.body?.Digits === "string" ? req.body.Digits : "";
    try {
      await updateCall(req.query.callId, { callback_digit: /^[12]$/.test(digit) ? digit : null, callback_at: new Date().toISOString() });
      const message = digit === "1"
        ? "Thank you. I have recorded that you acknowledged this PTMS update."
        : digit === "2"
          ? "I will repeat the update in your PTMS call history. Goodbye."
          : "No valid selection was received. The call outcome has been recorded.";
      return xmlResponse(res, "<Say>" + xml(message) + "</Say><Hangup/>");
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_response_webhook_error", message: error instanceof Error ? error.message : "unknown" }));
      return xmlResponse(res, "<Say>I could not save your response. Please check PTMS.</Say><Hangup/>", 500);
    }
  });

  app.post("/api/ivy/twilio/status", async (req, res) => {
    if (!verifyWebhook(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    const status = typeof req.body?.CallStatus === "string" && callStatuses.has(req.body.CallStatus) ? req.body.CallStatus : "failed";
    const duration = typeof req.body?.CallDuration === "string" && /^\d{1,8}$/.test(req.body.CallDuration) ? Number(req.body.CallDuration) : null;
    try {
      await updateCall(req.query.callId, {
        status,
        twilio_call_sid: typeof req.body?.CallSid === "string" ? req.body.CallSid.slice(0, 64) : null,
        duration_seconds: duration,
        updated_at: new Date().toISOString()
      });
      return res.status(204).end();
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_status_webhook_error", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(500).type("text/plain").send("Unable to update call status.");
    }
  });
}

export function registerIvyTwilioRoutes(app) {
  app.post("/api/ivy/calls", async (req, res) => {
    if (!twilioConfigured()) return res.status(503).json({ error: "Twilio is not fully configured. Add all five Twilio/Ivy environment values on the private server." });
    let title;
    let summary;
    let severity;
    try {
      title = clean(req.body?.title, 120, "Call title");
      summary = clean(req.body?.summary, 2500, "Call summary");
      severity = ["info", "warning", "critical"].includes(req.body?.severity) ? req.body.severity : "info";
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid call request." });
    }
    let client;
    try {
      client = serviceClient();
      const { data: record, error: insertError } = await client.from(table).insert({
        title,
        summary,
        severity,
        destination_number: process.env.IVY_OWNER_PHONE,
        source: "ptms_manual_or_approved_trigger",
        status: "queued"
      }).select("id,title,status,created_at").single();
      if (insertError || !record) throw new Error("Call history is not ready. Apply the Ivy calls database migration and verify SUPABASE_SERVICE_ROLE_KEY.");
      const base = "https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(process.env.TWILIO_ACCOUNT_SID) + "/Calls.json";
      const params = new URLSearchParams({
        To: process.env.IVY_OWNER_PHONE,
        From: process.env.TWILIO_PHONE_NUMBER,
        Url: webhookUrl(req, "voice", record.id),
        Method: "POST",
        StatusCallback: webhookUrl(req, "status", record.id),
        StatusCallbackMethod: "POST",
        StatusCallbackEvent: "initiated ringing answered completed"
      });
      const auth = Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64");
      const response = await fetch(base, {
        method: "POST",
        headers: { Authorization: "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
        signal: AbortSignal.timeout(20000)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        await client.from(table).update({ status: "failed", provider_error_code: String(payload?.code || response.status), updated_at: new Date().toISOString() }).eq("id", record.id);
        console.warn(JSON.stringify({ event: "ivy_twilio_call_rejected", httpStatus: response.status, providerCode: payload?.code || null, callRecordId: record.id }));
        return res.status(502).json({ error: "Twilio rejected the call request. Check the Twilio Console and account permissions.", callId: record.id });
      }
      await client.from(table).update({ status: payload.status || "queued", twilio_call_sid: payload.sid || null, updated_at: new Date().toISOString() }).eq("id", record.id);
      console.log(JSON.stringify({ event: "ivy_twilio_call_created", callRecordId: record.id, twilioCallSid: payload.sid || null, status: payload.status || "queued" }));
      return res.status(202).json({ accepted: true, callId: record.id, status: payload.status || "queued", message: "Twilio accepted the call request. This does not yet confirm that the phone rang or was answered." });
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_call_create_error", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(503).json({ error: error instanceof Error ? error.message : "Ivy could not start the call." });
    }
  });

  app.get("/api/ivy/calls/:id", async (req, res) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid call ID." });
    try {
      const call = await getCall(req.params.id);
      if (!call) return res.status(404).json({ error: "Call not found." });
      return res.json({ call });
    } catch (error) {
      return res.status(503).json({ error: error instanceof Error ? error.message : "Call history is unavailable." });
    }
  });
}
