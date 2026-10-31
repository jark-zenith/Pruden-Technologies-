import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const safeBoolean = (value) => value === "true";
const configured = (value) => typeof value === "string" && value.trim().length > 0;
const darajaBaseUrl = (env) => env.DARAJA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

export function getFinancialIntegrationStatus(env = process.env) {
  const sandbox = env.DARAJA_ENV !== "production";
  const hasCredentials = configured(env.DARAJA_CONSUMER_KEY) && configured(env.DARAJA_CONSUMER_SECRET);
  return {
    generatedAt: new Date().toISOString(),
    mode: "setup_only",
    daraja: {
      environment: sandbox ? "sandbox" : "production",
      enabled: safeBoolean(env.DARAJA_ENABLED),
      credentialsConfigured: hasCredentials,
      shortcodeConfigured: configured(env.DARAJA_SHORTCODE),
      passkeyConfigured: configured(env.DARAJA_PASSKEY),
      callbackTokenConfigured: configured(env.DARAJA_CALLBACK_TOKEN),
      stkPushEnabled: safeBoolean(env.DARAJA_STK_PUSH_ENABLED),
      c2bEnabled: safeBoolean(env.DARAJA_C2B_ENABLED),
      b2cEnabled: safeBoolean(env.DARAJA_B2C_ENABLED),
      b2bEnabled: safeBoolean(env.DARAJA_B2B_ENABLED),
      tokenTestAvailable: sandbox && hasCredentials,
      productionPaymentsAllowed: false
    },
    projectBridge: {
      enabled: safeBoolean(env.PTMS_FINANCE_BRIDGE_ENABLED),
      secretConfigured: configured(env.PTMS_FINANCE_BRIDGE_SECRET),
      ownerConfigured: configured(env.PTMS_FINANCE_OWNER_ID)
    },
    notes: [
      "No payment or disbursement is initiated by the status endpoint.",
      "Personal M-Pesa wallet statements require an authorized export or a separately approved Safaricom capability.",
      "Production payments remain disabled pending a separate production-readiness review."
    ]
  };
}

function safeEqual(left, right) {
  if (!configured(left) || !configured(right)) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function serviceClient(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configured(url) || !configured(key)) throw new Error("Server-side Supabase service configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 4 ? "••••" + digits.slice(-4) : null;
}

export function sanitizeDarajaCallback(kind, body = {}) {
  const root = body?.Body?.stkCallback || body?.stkCallback || body || {};
  if (kind === "stk") {
    const items = root?.CallbackMetadata?.Item || [];
    const metadata = Object.fromEntries(items.filter((item) => item?.Name).map((item) => [item.Name, item.Value]));
    return {
      eventId: String(root.CheckoutRequestID || root.MerchantRequestID || ""),
      eventType: "stk_callback",
      resultCode: root.ResultCode ?? null,
      resultDescription: String(root.ResultDesc || "").slice(0, 240),
      safePayload: {
        merchantRequestId: root.MerchantRequestID || null,
        checkoutRequestId: root.CheckoutRequestID || null,
        resultCode: root.ResultCode ?? null,
        amount: Number.isFinite(Number(metadata.Amount)) ? Number(metadata.Amount) : null,
        mpesaReceiptNumber: metadata.MpesaReceiptNumber ? String(metadata.MpesaReceiptNumber).slice(0, 32) : null,
        transactionDate: metadata.TransactionDate ? String(metadata.TransactionDate) : null,
        phone: maskPhone(metadata.PhoneNumber)
      }
    };
  }
  return {
    eventId: String(body.TransID || body.TransactionID || ""),
    eventType: "c2b_confirmation",
    resultCode: null,
    resultDescription: "C2B confirmation received; reconciliation is still required.",
    safePayload: {
      transactionType: String(body.TransactionType || "").slice(0, 80),
      transId: body.TransID ? String(body.TransID).slice(0, 32) : null,
      transTime: body.TransTime ? String(body.TransTime).slice(0, 32) : null,
      amount: Number.isFinite(Number(body.TransAmount)) ? Number(body.TransAmount) : null,
      businessShortCode: body.BusinessShortCode ? String(body.BusinessShortCode).slice(0, 32) : null,
      billReference: body.BillRefNumber ? String(body.BillRefNumber).slice(0, 80) : null,
      phone: maskPhone(body.MSISDN)
    }
  };
}

async function requestSandboxToken(env) {
  if (env.DARAJA_ENV === "production") throw new Error("Token testing is sandbox-only in this rollout.");
  if (!configured(env.DARAJA_CONSUMER_KEY) || !configured(env.DARAJA_CONSUMER_SECRET)) throw new Error("Daraja sandbox consumer key and secret are not configured.");
  const credentials = Buffer.from(env.DARAJA_CONSUMER_KEY + ":" + env.DARAJA_CONSUMER_SECRET).toString("base64");
  const response = await fetch(darajaBaseUrl(env) + "/oauth/v1/generate?grant_type=client_credentials", {
    method: "GET",
    headers: { Authorization: "Basic " + credentials, Accept: "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("Daraja sandbox token request failed with HTTP " + response.status + ".");
  return { expiresIn: Number(data.expires_in || 0), tokenType: data.token_type || "Bearer" };
}

async function saveCallbackEvent(env, provider, parsed, rawBody) {
  const client = serviceClient(env);
  const providerEventId = parsed.eventId || digest(rawBody);
  const row = {
    provider,
    provider_event_id: providerEventId,
    event_type: parsed.eventType,
    processing_status: "received",
    signature_valid: null,
    payload_digest: digest(rawBody),
    safe_payload: parsed.safePayload
  };
  const { error } = await client.from("pruden_financial_integration_events").upsert(row, {
    onConflict: "provider,provider_event_id",
    ignoreDuplicates: true
  });
  if (error) throw new Error("Callback receipt could not be persisted: " + error.message);
}

export function registerFinancialIntegrationRoutes(app, env = process.env) {
  app.get("/api/financial/integrations/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(getFinancialIntegrationStatus(env));
  });

  app.post("/api/financial/daraja/sandbox-token-test", async (_req, res) => {
    if (env.DARAJA_ENV === "production") return res.status(403).json({ success: false, error: "This test endpoint is restricted to the Daraja sandbox." });
    try {
      const result = await requestSandboxToken(env);
      return res.json({ success: true, environment: "sandbox", ...result, tokenReturnedToClient: false });
    } catch (error) {
      return res.status(503).json({ success: false, environment: "sandbox", error: error instanceof Error ? error.message : "Sandbox token test failed." });
    }
  });

  app.post("/api/daraja/stk-callback/:token", async (req, res) => {
    if (!safeEqual(req.params.token, env.DARAJA_CALLBACK_TOKEN)) return res.status(404).json({ ResultCode: 1, ResultDesc: "Not found" });
    try {
      const parsed = sanitizeDarajaCallback("stk", req.body);
      await saveCallbackEvent(env, "safaricom_daraja", parsed, req.body || {});
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Callback receipt stored for reconciliation." });
    } catch (error) {
      console.error(JSON.stringify({ event: "daraja_stk_callback_store_failed", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(503).json({ ResultCode: 1, ResultDesc: "Callback could not be persisted." });
    }
  });

  app.post("/api/daraja/c2b-confirmation/:token", async (req, res) => {
    if (!safeEqual(req.params.token, env.DARAJA_CALLBACK_TOKEN)) return res.status(404).json({ ResultCode: 1, ResultDesc: "Not found" });
    try {
      const parsed = sanitizeDarajaCallback("c2b", req.body);
      await saveCallbackEvent(env, "safaricom_daraja", parsed, req.body || {});
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Confirmation receipt stored for reconciliation." });
    } catch (error) {
      console.error(JSON.stringify({ event: "daraja_c2b_callback_store_failed", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(503).json({ ResultCode: 1, ResultDesc: "Confirmation could not be persisted." });
    }
  });

  app.post("/api/daraja/c2b-validation/:token", (req, res) => {
    if (!safeEqual(req.params.token, env.DARAJA_CALLBACK_TOKEN) || !safeBoolean(env.DARAJA_C2B_ENABLED)) {
      return res.status(200).json({ ResultCode: 1, ResultDesc: "Validation is disabled until the merchant account is configured." });
    }
    // Accept only after Safaricom account details and validation rules have been explicitly configured.
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Validation endpoint is enabled; final transaction verification occurs on confirmation." });
  });
}
