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
    owner_id: configured(env.DARAJA_OWNER_ID) ? env.DARAJA_OWNER_ID : null,
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

  app.post("/api/financial/project-events", async (req, res) => {
    if (!safeBoolean(env.PTMS_FINANCE_BRIDGE_ENABLED)) return res.status(503).json({ error: "Project financial bridge is disabled." });
    const auth = String(req.headers.authorization || "").replace(/^Bearer\\s+/i, "");
    if (!safeEqual(auth, env.PTMS_FINANCE_BRIDGE_SECRET)) return res.status(401).json({ error: "Invalid bridge credentials." });
    const ownerId = env.PTMS_FINANCE_OWNER_ID || "";
    const body = req.body || {};
    const validUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const amount = Number(body.amount);
    if (!validUuid(ownerId) || !validUuid(body.project_id)) return res.status(400).json({ error: "A valid owner and project ID must be configured." });
    if (typeof body.event_id !== "string" || body.event_id.length < 8 || body.event_id.length > 160) return res.status(400).json({ error: "event_id must be 8–160 characters." });
    if (!["income", "expense"].includes(body.kind) || !Number.isFinite(amount) || amount <= 0 || amount > 999999999999) return res.status(400).json({ error: "A valid income/expense kind and positive amount are required." });
    if (body.currency && body.currency !== "KES") return res.status(400).json({ error: "Only KES project events are currently supported." });
    if (body.payment_status !== "confirmed" || typeof body.provider_reference !== "string" || body.provider_reference.length < 3 || body.provider_reference.length > 120) return res.status(400).json({ error: "Only provider-confirmed events with a provider reference can enter the financial ledger." });
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 100) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 1000) : "";
    if (!category || !description) return res.status(400).json({ error: "category and description are required." });
    try {
      const client = serviceClient(env);
      const { data: project, error: projectError } = await client.from("pruden_projects").select("id,name").eq("id", body.project_id).eq("owner_id", ownerId).maybeSingle();
      if (projectError || !project) return res.status(404).json({ error: "Project not found for the configured PTMS owner." });
      const idempotencyKey = "project:" + body.event_id;
      const { data: existing } = await client.from("pruden_financial_transactions").select("id").eq("owner_id", ownerId).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing) return res.status(200).json({ accepted: true, duplicate: true, transaction_id: existing.id });
      const occurredAt = body.occurred_at && !Number.isNaN(Date.parse(body.occurred_at)) ? new Date(body.occurred_at).toISOString() : new Date().toISOString();
      const transaction = {
        owner_id: ownerId,
        project_id: project.id,
        kind: body.kind,
        amount: Math.round(amount * 100) / 100,
        currency: "KES",
        category,
        description,
        occurred_at: occurredAt,
        source: "project_webhook",
        status: "confirmed",
        verification_status: "provider_verified",
        external_reference: body.provider_reference,
        idempotency_key: idempotencyKey,
        project_reference: project.name,
        metadata: { eventId: body.event_id, paymentProvider: String(body.payment_provider || "unspecified").slice(0, 60) }
      };
      const { data: saved, error: insertError } = await client.from("pruden_financial_transactions").insert(transaction).select("id").single();
      if (insertError) {
        if (insertError.code === "23505") return res.status(200).json({ accepted: true, duplicate: true });
        throw insertError;
      }
      const debitAccount = body.kind === "income" ? "cash_or_payment_clearing" : "project_expense";
      const creditAccount = body.kind === "income" ? "project_revenue" : "cash_or_payment_clearing";
      const { error: entriesError } = await client.from("pruden_financial_ledger_entries").insert([
        { owner_id: ownerId, transaction_id: saved.id, project_id: project.id, entry_side: "debit", ledger_account: debitAccount, amount: transaction.amount, currency: "KES", memo: description },
        { owner_id: ownerId, transaction_id: saved.id, project_id: project.id, entry_side: "credit", ledger_account: creditAccount, amount: transaction.amount, currency: "KES", memo: description }
      ]);
      if (entriesError) {
        await client.from("pruden_financial_transactions").delete().eq("id", saved.id).eq("owner_id", ownerId);
        throw new Error("Journal entries failed; transaction was rolled back: " + entriesError.message);
      }
      await client.from("pruden_financial_integration_events").upsert({
        owner_id: ownerId, provider: "project_webhook", provider_event_id: body.event_id,
        event_type: "project_payment_confirmed", processing_status: "processed", signature_valid: true,
        payload_digest: digest(body), safe_payload: { projectId: project.id, amount: transaction.amount, currency: "KES", kind: body.kind, providerReference: body.provider_reference }
      }, { onConflict: "provider,provider_event_id", ignoreDuplicates: true });
      return res.status(201).json({ accepted: true, duplicate: false, transaction_id: saved.id, project: project.name });
    } catch (error) {
      console.error(JSON.stringify({ event: "project_financial_event_failed", message: error instanceof Error ? error.message : "unknown" }));
      return res.status(503).json({ error: "Project financial event could not be recorded." });
    }
  });
}
