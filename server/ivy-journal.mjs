import { createClient } from "@supabase/supabase-js";

const fields = ["summary", "completed_work", "idea_updates", "decisions_lessons", "financial_notes", "blockers", "next_actions"];
const maxLengths = { summary: 5000, completed_work: 10000, idea_updates: 5000, decisions_lessons: 5000, financial_notes: 3000, blockers: 3000, next_actions: 5000 };
const clean = (value, max) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Journal fields must be text.");
  return value.trim().slice(0, max);
};
function dateInNairobi(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function dayBounds(date) {
  const start = new Date(date + "T00:00:00+03:00");
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}
export const ivyJournalTools = [
  { name: "ivy_journal_list", description: "Read saved daily journal entries belonging to the signed-in founder. Use this to avoid duplicate entries and retrieve earlier summaries.", input_schema: { type: "object", properties: { from_date: { type: "string" }, to_date: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 90 } }, required: [] } },
  { name: "ivy_journal_activity_today", description: "Gather evidence from today's owner-scoped PTMS audit events, task/project updates, and saved Finance records. Returns records and verified data only; does not include chat conversations outside PTMS.", input_schema: { type: "object", properties: { journal_date: { type: "string" } }, required: [] } },
  { name: "ivy_journal_save", description: "Save or update the founder's daily journal entry for a date. Call only after summarizing available evidence; distinguish completed work from plans, include financial notes only when verified, and report the returned record ID. One entry per date is updated idempotently.", input_schema: { type: "object", properties: { journal_date: { type: "string" }, summary: { type: "string" }, completed_work: { type: "string" }, idea_updates: { type: "string" }, decisions_lessons: { type: "string" }, financial_notes: { type: "string" }, blockers: { type: "string" }, next_actions: { type: "string" } }, required: ["journal_date", "summary"] } }
];

function makeOwnerClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Supabase server configuration is missing.");
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 8192) throw new Error("A signed-in founder session is required.");
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: "Bearer " + accessToken } } });
  return client;
}
function validateDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value + "T00:00:00Z"))) throw new Error("Journal date must use YYYY-MM-DD.");
  return value;
}

export async function executeIvyJournalTool(name, input, accessToken) {
  const client = makeOwnerClient(accessToken);
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData?.user?.id) throw new Error("Your signed-in session could not be verified.");
  const ownerId = authData.user.id;
  if (name === "ivy_journal_list") {
    let query = client.from("pruden_daily_journal").select("*").eq("owner_id", ownerId).order("journal_date", { ascending: false }).limit(Math.min(90, Math.max(1, Number.isInteger(input.limit) ? input.limit : 30)));
    if (input.from_date) query = query.gte("journal_date", validateDate(input.from_date));
    if (input.to_date) query = query.lte("journal_date", validateDate(input.to_date));
    const { data, error } = await query;
    if (error) throw new Error("Journal read failed: " + error.message);
    return { status: "ok", entries: data || [] };
  }
  if (name === "ivy_journal_activity_today") {
    const date = validateDate(input.journal_date || dateInNairobi());
    const { start, end } = dayBounds(date);
    const [audit, tasks, projects, finance] = await Promise.all([
      client.from("pruden_audit_events").select("action,entity_type,entity_id,details,created_at").eq("owner_id", ownerId).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }).limit(200),
      client.from("pruden_tasks").select("id,title,status,updated_at").eq("owner_id", ownerId).gte("updated_at", start).lt("updated_at", end).limit(100),
      client.from("pruden_projects").select("id,name,status,updated_at").eq("owner_id", ownerId).gte("updated_at", start).lt("updated_at", end).limit(100),
      client.from("pruden_financial_records").select("id,kind,amount,currency,category,description,occurred_on").eq("owner_id", ownerId).gte("occurred_on", date).lt("occurred_on", dateInNairobi(new Date(new Date(start).getTime() + 86400000))).limit(100)
    ]);
    if (audit.error) throw new Error("Journal activity audit read failed: " + audit.error.message);
    if (tasks.error) throw new Error("Journal activity task read failed: " + tasks.error.message);
    if (projects.error) throw new Error("Journal activity project read failed: " + projects.error.message);
    if (finance.error) throw new Error("Journal activity Finance read failed: " + finance.error.message);
    return { journal_date: date, timezone: "Africa/Nairobi", audit_events: audit.data || [], task_updates: tasks.data || [], project_updates: projects.data || [], finance_records: finance.data || [], coverage_note: "Only available PTMS records are included. Conversations outside PTMS and unrecorded offline work are not accessible through this tool." };
  }
  if (name === "ivy_journal_save") {
    const date = validateDate(input.journal_date);
    const summary = clean(input.summary, maxLengths.summary);
    if (!summary) throw new Error("A non-empty daily summary is required.");
    const { data: existing, error: existingError } = await client.from("pruden_daily_journal").select("*").eq("owner_id", ownerId).eq("journal_date", date).maybeSingle();
    if (existingError) throw new Error("Journal revision read failed: " + existingError.message);
    const previousActivity = Array.isArray(existing?.source_activity)
      ? existing.source_activity
      : existing?.source_activity
        ? [{ kind: "system_activity_snapshot", captured_at: existing.updated_at, value: existing.source_activity }]
        : [];
    const snapshot = existing ? {
      kind: "revision", revised_at: new Date().toISOString(), revised_by: "ivy",
      prior_entry: {
        journal_date: existing.journal_date, timezone: existing.timezone, summary: existing.summary,
        completed_work: existing.completed_work, idea_updates: existing.idea_updates,
        decisions_lessons: existing.decisions_lessons, financial_notes: existing.financial_notes,
        blockers: existing.blockers, next_actions: existing.next_actions, source: existing.source,
        updated_at: existing.updated_at
      }
    } : null;
    const row = {
      owner_id: ownerId, journal_date: date, timezone: "Africa/Nairobi", source: "ivy",
      source_activity: [...previousActivity, ...(snapshot ? [snapshot] : [])].slice(-60),
      updated_at: new Date().toISOString()
    };
    for (const field of fields) row[field] = clean(input[field], maxLengths[field]);
    const { data, error } = await client.from("pruden_daily_journal").upsert(row, { onConflict: "owner_id,journal_date" }).select("*").single();
    if (error) throw new Error("Journal save failed: " + error.message);
    const { error: auditError } = await client.from("pruden_audit_events").insert({ owner_id: ownerId, actor_id: ownerId, action: "daily_journal.saved_by_ivy", entity_type: "daily_journal", entity_id: data.id, details: { journal_date: date, source: "ivy" } });
    return { status: "saved", journal_id: data.id, journal_date: date, updated_at: data.updated_at, audit_recorded: !auditError, note: auditError ? "Journal saved, but its audit event could not be recorded." : "Journal and audit event saved." };
  }
  throw new Error("Ivy journal operation is not allowlisted.");
}
