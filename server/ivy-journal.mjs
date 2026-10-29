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
    const row = { owner_id: ownerId, journal_date: date, timezone: "Africa/Nairobi", source: "ivy", updated_at: new Date().toISOString() };
    for (const field of fields) row[field] = clean(input[field], maxLengths[field]);
    const { data, error } = await client.from("pruden_daily_journal").upsert(row, { onConflict: "owner_id,journal_date" }).select("*").single();
    if (error) throw new Error("Journal save failed: " + error.message);
    const { error: auditError } = await client.from("pruden_audit_events").insert({ owner_id: ownerId, actor_id: ownerId, action: "daily_journal.saved_by_ivy", entity_type: "daily_journal", entity_id: data.id, details: { journal_date: date, source: "ivy" } });
    return { status: "saved", journal_id: data.id, journal_date: date, updated_at: data.updated_at, audit_recorded: !auditError, note: auditError ? "Journal saved, but its audit event could not be recorded." : "Journal and audit event saved." };
  }
  throw new Error("Ivy journal operation is not allowlisted.");
}

// Optional persistent scheduler. It deliberately does nothing until the private server
// has both the service-role key and the single founder's Supabase auth user ID configured.
export function startIvyJournalScheduler() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const ownerId = process.env.IVY_JOURNAL_OWNER_ID || "";
  if (!serviceKey || !url || !/^[0-9a-f-]{36}$/i.test(ownerId)) {
    console.warn(JSON.stringify({ event: "ivy_daily_journal_scheduler_disabled", reason: "Requires SUPABASE_SERVICE_ROLE_KEY and IVY_JOURNAL_OWNER_ID on the private server.", at: new Date().toISOString() }));
    return;
  }
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  let lastAttemptedDate = "";
  const tick = async () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    const date = dateInNairobi(now);
    if (parts !== "18:00" || lastAttemptedDate === date) return;
    lastAttemptedDate = date;
    const runBase = { owner_id: ownerId, journal_date: date, trigger_source: "scheduled" };
    try {
      const { data: existing, error: readError } = await client.from("pruden_daily_journal").select("id").eq("owner_id", ownerId).eq("journal_date", date).maybeSingle();
      if (readError) throw readError;
      if (existing) {
        await client.from("pruden_daily_journal_runs").upsert({ ...runBase, status: "skipped", details: { reason: "A manual or Ivy entry already exists for this date." }, completed_at: new Date().toISOString() }, { onConflict: "owner_id,journal_date,trigger_source" });
        console.log(JSON.stringify({ event: "ivy_daily_journal_skipped", journal_date: date, reason: "entry_exists", at: new Date().toISOString() }));
        return;
      }
      const { start, end } = dayBounds(date);
      const [audit, tasks, projects, finance] = await Promise.all([
        client.from("pruden_audit_events").select("action,entity_type,created_at").eq("owner_id", ownerId).gte("created_at", start).lt("created_at", end).limit(200),
        client.from("pruden_tasks").select("title,status,updated_at").eq("owner_id", ownerId).gte("updated_at", start).lt("updated_at", end).limit(100),
        client.from("pruden_projects").select("name,status,updated_at").eq("owner_id", ownerId).gte("updated_at", start).lt("updated_at", end).limit(100),
        client.from("pruden_financial_records").select("kind,amount,currency,category,description,occurred_on").eq("owner_id", ownerId).gte("occurred_on", date).lt("occurred_on", dateInNairobi(new Date(new Date(start).getTime() + 86400000))).limit(100)
      ]);
      for (const result of [audit, tasks, projects, finance]) if (result.error) throw result.error;
      const audits = audit.data || [], taskRows = tasks.data || [], projectRows = projects.data || [], financeRows = finance.data || [];
      const completed = taskRows.filter(row => row.status === "completed").map(row => row.title);
      const taskNotes = taskRows.map(row => row.title + " — " + row.status);
      const projectNotes = projectRows.map(row => row.name + " — " + row.status);
      const financialNotes = financeRows.map(row => row.occurred_on + " · " + row.kind + " · " + row.currency + " " + row.amount + " · " + row.category + (row.description ? " · " + row.description : ""));
      const summary = "Automated daily summary for " + date + " (Africa/Nairobi), generated from available PTMS records: " + audits.length + " audit event(s), " + taskRows.length + " task update(s), " + projectRows.length + " project update(s), and " + financeRows.length + " Finance record(s). This summary does not include activity outside PTMS.";
      const journal = { owner_id: ownerId, journal_date: date, timezone: "Africa/Nairobi", source: "scheduled", summary, completed_work: completed.length ? completed.map(title => "Completed task: " + title).join("\n") : (taskNotes.length ? taskNotes.join("\n") : "No task updates were found in available PTMS records."), idea_updates: projectNotes.join("\n"), decisions_lessons: audits.map(row => row.action + " (" + row.entity_type + ")").join("\n"), financial_notes: financialNotes.length ? financialNotes.join("\n") : "No Finance records were found for this date; this is not proof that no offline spending occurred.", blockers: "", next_actions: taskRows.filter(row => row.status !== "completed").map(row => "Review: " + row.title + " (" + row.status + ")").join("\n") };
      const { data: saved, error: saveError } = await client.from("pruden_daily_journal").upsert(journal, { onConflict: "owner_id,journal_date" }).select("id").single();
      if (saveError) throw saveError;
      await client.from("pruden_daily_journal_runs").upsert({ ...runBase, status: "completed", details: { journal_id: saved.id, audit_count: audits.length, task_count: taskRows.length, project_count: projectRows.length, finance_count: financeRows.length }, completed_at: new Date().toISOString() }, { onConflict: "owner_id,journal_date,trigger_source" });
      console.log(JSON.stringify({ event: "ivy_daily_journal_scheduled_saved", journal_date: date, journal_id: saved.id, at: new Date().toISOString() }));
    } catch (error) {
      await client.from("pruden_daily_journal_runs").upsert({ ...runBase, status: "failed", details: { error: String(error?.message || "unknown").slice(0, 300) }, completed_at: new Date().toISOString() }, { onConflict: "owner_id,journal_date,trigger_source" }).catch(() => {});
      console.error(JSON.stringify({ event: "ivy_daily_journal_schedule_failed", journal_date: date, error: String(error?.message || "unknown").slice(0, 300), at: new Date().toISOString() }));
      lastAttemptedDate = ""; // Permit a retry on the next minute while the target hour remains active.
    }
  };
  const timer = setInterval(() => { void tick(); }, 30000);
  timer.unref?.();
  void tick();
  console.log(JSON.stringify({ event: "ivy_daily_journal_scheduler_started", timezone: "Africa/Nairobi", target: "18:00", at: new Date().toISOString() }));
}
