import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const allowedOrigins = new Set([
  "https://arc-africa-recruitment.onrender.com",
  "https://pruden-technologies.onrender.com",
  "https://pruden-command-secure.onrender.com",
  "https://glow-gold-salon-demo-hjl03x.v2.appdeploy.ai",
]);
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (!origin || !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 202, origin);

  const sourceSite = typeof body.source_site === "string" ? body.source_site.trim().slice(0, 120) : "";
  const sourceUrl = typeof body.source_url === "string" ? body.source_url.slice(0, 500) : null;
  const submissionType = typeof body.submission_type === "string" ? body.submission_type : "application";
  const allowedTypes = new Set(["application", "booking", "contact", "feedback", "quote_request", "support", "other"]);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : null;
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : null;
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : null;
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 10000) : null;
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
    ? body.payload as Record<string, unknown> : {};

  if (!sourceSite || !allowedTypes.has(submissionType) || (!message && Object.keys(payload).length === 0)) {
    return json({ error: "Please provide a source site, valid submission type, and message or form fields." }, 400, origin);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please provide a valid email address." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Inbox storage is not configured." }, 503, origin);

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("website_inbox").insert({
    source_site: sourceSite,
    source_url: sourceUrl,
    submission_type: submissionType,
    name,
    email,
    phone,
    subject,
    message,
    payload,
    email_notification_status: "not_configured",
    whatsapp_notification_status: "not_configured",
  }).select("id, created_at").single();

  if (error) {
    console.error("website_inbox insert failed", error.message);
    return json({ error: "Could not save your submission. Please try again later." }, 500, origin);
  }
  return json({ ok: true, id: data.id, received_at: data.created_at }, 201, origin);
});