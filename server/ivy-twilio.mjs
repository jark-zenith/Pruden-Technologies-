import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const table = "pruden_ivy_calls";
const messagesTable = "pruden_ivy_messages";
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
function twilioMessagingConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.IVY_OWNER_PHONE);
}
function validE164(value) {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
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
async function updateMessage(messageId, patch) {
  const client = serviceClient();
  const { data, error } = await client.from(messagesTable).update(patch).eq("id", messageId).select("id,status,twilio_message_sid,updated_at").maybeSingle();
  if (error) throw new Error("Message record update failed.");
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
    callHistory: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) ? "database_required_and_migration_pending_or_applied" : "service_role_key_required",
    inboundVoice: twilioConfigured() ? "webhook_ready_number_configuration_pending" : "setup_required",
    outboundSms: twilioMessagingConfigured() ? "configured_unverified" : "setup_required",
    inboundSms: twilioMessagingConfigured() ? "webhook_ready_number_configuration_pending" : "setup_required"
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

  app.post("/api/ivy/twilio/inbound-voice", async (req, res) => {
    if (!validateTwilioRequest(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    const callSid = typeof req.body?.CallSid === "string" ? req.body.CallSid : "";
    const caller = typeof req.body?.From === "string" ? req.body.From : "";
    const destination = typeof req.body?.To === "string" ? req.body.To : "";
    if (!/^CA[0-9a-f]{32}$/i.test(callSid) || !validE164(caller) || !validE164(destination)) {
      return xmlResponse(res, "<Say>We could not validate this call.</Say><Hangup/>", 400);
    }
    try {
      const client = serviceClient();
      const { data: record, error } = await client.from(table).insert({
        title: "Inbound call",
        summary: "Caller reached the PRUDEN Technologies Ivy IVR.",
        severity: "info",
        source: "twilio_inbound_call",
        destination_number: destination,
        caller_number: caller,
        direction: "inbound",
        twilio_call_sid: callSid,
        status: "in-progress"
      }).select("id").single();
      if (error || !record) throw new Error("Inbound call could not be recorded.");
      const action = xml(webhookUrl(req, "inbound-choice", record.id));
      const gather = '<Gather input="dtmf" numDigits="1" timeout="8" action="' + action + '" method="POST"><Say>Thank you for calling PRUDEN Technologies. I am Ivy, the virtual assistant. Press 1 to hear about our services. Press 2 to request a callback.</Say></Gather>';
      return xmlResponse(res, gather + "<Say>We did not receive a selection. Goodbye.</Say><Hangup/>");
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_inbound_voice_error", message: error instanceof Error ? error.message : "unknown" }));
      return xmlResponse(res, "<Say>We are unable to process your call right now. Please try again later.</Say><Hangup/>", 500);
    }
  });

  app.post("/api/ivy/twilio/inbound-choice", async (req, res) => {
    if (!verifyWebhook(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    const digit = typeof req.body?.Digits === "string" ? req.body.Digits : "";
    try {
      const message = digit === "1"
        ? "PRUDEN Technologies builds digital products, websites, AI solutions and business automation systems. Thank you for calling."
        : digit === "2"
          ? "Your callback request has been recorded. The PRUDEN Technologies team will follow up."
          : "No valid selection was received. Please contact PRUDEN Technologies again.";
      await updateCall(req.query.callId, {
        callback_digit: digit === "1" || digit === "2" ? digit : null,
        callback_at: new Date().toISOString(),
        status: digit === "1" || digit === "2" ? "completed" : "no-answer"
      });
      return xmlResponse(res, "<Say>" + xml(message) + "</Say><Hangup/>");
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_inbound_choice_error", message: error instanceof Error ? error.message : "unknown" }));
      return xmlResponse(res, "<Say>We could not save your selection. Goodbye.</Say><Hangup/>", 500);
    }
  });

  app.post("/api/ivy/twilio/inbound-sms", async (req, res) => {
    if (!validateTwilioRequest(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    const sid = typeof req.body?.MessageSid === "string" ? req.body.MessageSid : (typeof req.body?.SmsSid === "string" ? req.body.SmsSid : "");
    const from = typeof req.body?.From === "string" ? req.body.From : "";
    const to = typeof req.body?.To === "string" ? req.body.To : "";
    const body = typeof req.body?.Body === "string" ? req.body.Body.trim() : "";
    if (!/^SM[0-9a-f]{32}$/i.test(sid) || !validE164(from) || !validE164(to) || !body || body.length > 1600) {
      return res.status(400).type("text/plain").send("Invalid message payload.");
    }
    try {
      const client = serviceClient();
      const { error } = await client.from(messagesTable).upsert({
        direction: "inbound",
        from_number: from,
        to_number: to,
        body,
        status: "received",
        twilio_message_sid: sid,
        source: "twilio_inbound_sms",
        updated_at: new Date().toISOString()
      }, { onConflict: "twilio_message_sid" });
      if (error) throw new Error("Inbound SMS could not be recorded.");
      return res.status(200).type("text/xml").send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_inbound_sms_error", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(500).type("text/plain").send("Unable to record message.");
    }
  });

  app.post("/api/ivy/twilio/message-status", async (req, res) => {
    if (!verifyWebhook(req)) return res.status(403).type("text/plain").send("Invalid webhook signature.");
    const allowed = new Set(["accepted", "queued", "sending", "sent", "delivered", "undelivered", "failed", "read"]);
    const status = typeof req.body?.MessageStatus === "string" && allowed.has(req.body.MessageStatus) ? req.body.MessageStatus : "failed";
    const errorCode = typeof req.body?.ErrorCode === "string" && /^\d{1,8}$/.test(req.body.ErrorCode) ? req.body.ErrorCode : null;
    try {
      await updateMessage(req.query.callId, {
        status,
        twilio_message_sid: typeof req.body?.MessageSid === "string" ? req.body.MessageSid.slice(0, 64) : null,
        provider_error_code: errorCode,
        updated_at: new Date().toISOString()
      });
      return res.status(204).end();
    } catch (error) {
      console.error(JSON.stringify({ event: "ivy_twilio_message_status_error", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(500).type("text/plain").send("Unable to update message status.");
    }
  });
}


async function twilioRequest(path) {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  if (!sid || !token) throw new Error("Twilio Account SID and Auth Token are required.");
  const auth = Buffer.from(sid + ":" + token).toString("base64");
  const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(sid) + path, {
    headers: { Authorization: "Basic " + auth },
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Twilio account check failed.");
    error.providerCode = payload?.code || response.status;
    throw error;
  }
  return payload;
}

export async function inspectIvyTwilioAccount() {
  const account = await twilioRequest(".json");
  const numbers = await twilioRequest("/IncomingPhoneNumbers.json?PageSize=100");
  const allNumbers = Array.isArray(numbers?.incoming_phone_numbers) ? numbers.incoming_phone_numbers : [];
  const voiceNumbers = allNumbers
    .filter((number) => number?.capabilities?.voice === true)
    .map((number) => ({
      phoneNumber: String(number.phone_number || ""),
      friendlyName: String(number.friendly_name || ""),
      voiceEnabled: true,
      smsEnabled: number?.capabilities?.sms === true
    }));
  const smsNumbers = allNumbers
    .filter((number) => number?.capabilities?.sms === true)
    .map((number) => ({ phoneNumber: String(number.phone_number || ""), friendlyName: String(number.friendly_name || ""), smsEnabled: true }));
  const configuredFrom = process.env.TWILIO_PHONE_NUMBER || "";
  const selected = voiceNumbers.find((number) => number.phoneNumber === configuredFrom) || null;
  const selectedSms = smsNumbers.find((number) => number.phoneNumber === configuredFrom) || null;
  return {
    accountStatus: String(account?.status || "unknown"),
    accountType: String(account?.type || "unknown"),
    voiceCapableNumbers: voiceNumbers,
    smsCapableNumbers: smsNumbers,
    configuredFromNumberPresent: Boolean(configuredFrom),
    configuredFromNumberVoiceEnabled: Boolean(selected),
    configuredFromNumberSmsEnabled: Boolean(selectedSms),
    configuredFromNumber: configuredFrom || null,
    outboundCallConfigurationComplete: Boolean(selected && process.env.IVY_OWNER_PHONE && process.env.TWILIO_VOICE_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY),
    outboundSmsConfigurationComplete: Boolean(selectedSms && process.env.IVY_OWNER_PHONE && process.env.SUPABASE_SERVICE_ROLE_KEY),
    inboundVoiceWebhook: "/api/ivy/twilio/inbound-voice",
    inboundSmsWebhook: "/api/ivy/twilio/inbound-sms",
    kenyaGeoPermissions: "not_checked_in_api; verify Voice > Settings > Geo Permissions in Twilio Console"
  };
}


export async function sendIvyOwnerSms({ req, body, source = "ivy_chat_explicit_owner_sms" }) {
  if (!twilioMessagingConfigured()) throw new Error("Twilio SMS is not configured. A messaging-capable Twilio number, account credentials and founder destination are required.");
  const safeBody = clean(body, 1500, "SMS body");
  const destination = process.env.IVY_OWNER_PHONE;
  const sender = process.env.TWILIO_PHONE_NUMBER;
  if (!validE164(destination) || !validE164(sender)) throw new Error("Twilio sender and founder destination must use E.164 phone-number format.");
  const client = serviceClient();
  const { data: record, error: insertError } = await client.from(messagesTable).insert({
    direction: "outbound",
    from_number: sender,
    to_number: destination,
    body: safeBody,
    status: "queued",
    source
  }).select("id,status,created_at").single();
  if (insertError || !record) throw new Error("Message history is not ready. Apply the Ivy communications database migration first.");
  const base = "https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(process.env.TWILIO_ACCOUNT_SID) + "/Messages.json";
  const params = new URLSearchParams({
    To: destination,
    From: sender,
    Body: safeBody,
    StatusCallback: webhookUrl(req, "message-status", record.id)
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
    await updateMessage(record.id, { status: "failed", provider_error_code: String(payload?.code || response.status), updated_at: new Date().toISOString() });
    const error = new Error("Twilio rejected the SMS request. Check account trial restrictions, sender capabilities and destination verification.");
    error.providerCode = payload?.code || response.status;
    throw error;
  }
  await updateMessage(record.id, {
    status: payload.status || "queued",
    twilio_message_sid: payload.sid || null,
    updated_at: new Date().toISOString()
  });
  return {
    accepted: true,
    messageId: record.id,
    status: payload.status || "queued",
    message: "Twilio accepted the SMS request. Delivery is not confirmed until a delivered status callback arrives."
  };
}

export async function createIvyOwnerCall({ req, title, summary, severity = "info", source = "ivy_chat_explicit_owner_call" }) {
  if (!twilioConfigured()) throw new Error("Twilio is not fully configured. A Voice-enabled Twilio number, owner destination, webhook secret, Account SID and Auth Token are required.");
  const safeTitle = clean(title, 120, "Call title");
  const safeSummary = clean(summary, 2500, "Call summary");
  const safeSeverity = ["info", "warning", "critical"].includes(severity) ? severity : "info";
  const client = serviceClient();
  const { data: record, error: insertError } = await client.from(table).insert({
    title: safeTitle,
    summary: safeSummary,
    severity: safeSeverity,
    destination_number: process.env.IVY_OWNER_PHONE,
    source,
    status: "queued"
  }).select("id,title,status,created_at").single();
  if (insertError || !record) throw new Error("Call history is not ready. Apply the Ivy calls database migration and verify server-side Supabase configuration.");
  const base = "https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(process.env.TWILIO_ACCOUNT_SID) + "/Calls.json";
  const params = new URLSearchParams({
    To: process.env.IVY_OWNER_PHONE,
    From: process.env.TWILIO_PHONE_NUMBER,
    Url: webhookUrl(req, "voice", record.id),
    Method: "POST",
    StatusCallback: webhookUrl(req, "status", record.id),
    StatusCallbackMethod: "POST"
  });
  for (const event of ["initiated", "ringing", "answered", "completed"]) params.append("StatusCallbackEvent", event);
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
    const error = new Error("Twilio rejected the call request. Check the Twilio Console and account permissions.");
    error.providerCode = payload?.code || response.status;
    throw error;
  }
  await client.from(table).update({ status: payload.status || "queued", twilio_call_sid: payload.sid || null, updated_at: new Date().toISOString() }).eq("id", record.id);
  console.log(JSON.stringify({ event: "ivy_twilio_call_created", callRecordId: record.id, twilioCallSid: payload.sid || null, status: payload.status || "queued" }));
  return {
    accepted: true,
    callId: record.id,
    status: payload.status || "queued",
    message: "Twilio accepted the call request. This does not yet confirm that the phone rang or was answered."
  };
}

export function registerIvyTwilioRoutes(app) {
  app.post("/api/ivy/calls", async (req, res) => {
    try {
      const result = await createIvyOwnerCall({
        req,
        title: req.body?.title,
        summary: req.body?.summary,
        severity: req.body?.severity,
        source: "ptms_manual_or_approved_trigger"
      });
      return res.status(202).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ivy could not start the call.";
      const status = /required|must be|between/i.test(message) ? 400 : /Twilio rejected/i.test(message) ? 502 : 503;
      console.error(JSON.stringify({ event: "ivy_twilio_call_create_error", message }));
      return res.status(status).json({ error: message });
    }
  });

  app.post("/api/ivy/messages/owner", async (req, res) => {
    try {
      const result = await sendIvyOwnerSms({ req, body: req.body?.body, source: "ptms_manual_or_approved_trigger" });
      return res.status(202).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ivy could not send the SMS.";
      const status = /required|must be|between/i.test(message) ? 400 : /Twilio rejected/i.test(message) ? 502 : 503;
      console.error(JSON.stringify({ event: "ivy_twilio_sms_create_error", message }));
      return res.status(status).json({ error: message, providerCode: Number.isFinite(Number(error?.providerCode)) ? Number(error.providerCode) : null });
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
