import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { BookOpenText, CalendarClock, Check, CircleAlert, Lightbulb, RefreshCw, Search, Save, Sparkles } from "lucide-react";
import { requireSupabase } from "./lib/supabase";

type JournalEntry = {
  id: string; owner_id: string; journal_date: string; timezone: string; summary: string;
  completed_work: string; idea_updates: string; decisions_lessons: string; financial_notes: string;
  blockers: string; next_actions: string; source_activity: unknown[]; source: "manual" | "ivy" | "scheduled";
  created_at: string; updated_at: string;
};
type Draft = Omit<JournalEntry, "id" | "owner_id" | "created_at" | "updated_at" | "source_activity" | "source">;
const todayNairobi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const field = { width: "100%", minWidth: 0, padding: "10px 12px", border: "1px solid var(--border, #2b3a50)", borderRadius: 9, background: "var(--surface, #101827)", color: "inherit", font: "inherit" } as const;
const label = { display: "grid", gap: 6, fontSize: 12, color: "var(--muted, #8291a9)" } as const;
const blank = (date = todayNairobi()): Draft => ({ journal_date: date, timezone: "Africa/Nairobi", summary: "", completed_work: "", idea_updates: "", decisions_lessons: "", financial_notes: "", blockers: "", next_actions: "" });
const titleCase = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const starterIdeas = [
  { title: "V.E.T.I Technology and Innovation Club", category: "college_personal", priority: "P1", description: "Ongoing college initiative. Build a founding team of 3–4 and propose AI/software development, technology talks and meetups, practical websites/products, cybersecurity, and networking. Track lecturer, department secretary, and principal approval; keep approval status unconfirmed until recorded." },
  { title: "Become more involved in Claude Community Kenya", category: "community_networking", priority: "P2", description: "Longer-term community participation goal. Identify useful ways to contribute and record confirmed opportunities; do not assume an ambassador role or acceptance." },
  { title: "Connect with Billy about community involvement", category: "community_networking", priority: "P2", description: "Prepare and track honest, warm outreach to Billy about ways to contribute more. Record outreach and follow-up only when they actually happen." },
  { title: "Google Play developer account savings — 2026", category: "savings_goal", priority: "P1", description: "Reference the existing Google Play developer account savings goal. Do not create a second savings goal or duplicate Finance transactions. Pull current amount, target, and status from the existing savings-goal record when available." },
  { title: "Potential Kitengela photography work", category: "income_opportunity", priority: "P2", description: "Potential side-income idea if a college friend confirms lending a camera. Until confirmed, track camera availability as a dependency. Later assess startup costs, photography services, portfolio samples, local clients, pricing, and first-income milestones." }
];

export default function IdeasJournalPage({ user }: { user: User }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [draft, setDraft] = useState<Draft>(() => blank());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState<"manual" | "ivy">("manual");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data, error: queryError } = await requireSupabase().from("pruden_daily_journal").select("*").eq("owner_id", user.id).order("journal_date", { ascending: false }).limit(180);
      if (queryError) throw queryError;
      setEntries((data || []) as JournalEntry[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Journal could not be loaded. Confirm the daily-journal migration is applied.");
    } finally { setLoading(false); }
  }, [user.id]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setSeeding(true);
      try {
        const db = requireSupabase();
        const { data: existing, error: existingError } = await db.from("pruden_ideas").select("id,title").eq("owner_id", user.id).limit(500);
        if (existingError) throw existingError;
        const titles = new Set((existing || []).map((row: { title: string }) => row.title.trim().toLowerCase()));
        let savingsContext = "Existing savings goal not verified in this session; review Finance before quoting amounts.";
        const { data: goals, error: goalsError } = await db.from("pruden_savings_goals").select("id,name,target_amount,mpesa_amount,cash_amount,status,currency").eq("owner_id", user.id).ilike("name", "%Google Play%").limit(5);
        if (!goalsError && goals?.length) {
          const goal = goals[0];
          const total = Number(goal.mpesa_amount || 0) + Number(goal.cash_amount || 0);
          savingsContext = "Linked existing savings goal ID " + goal.id + "; target " + goal.currency + " " + Number(goal.target_amount || 0) + "; allocated capital " + total + "; status " + goal.status + ". This idea is only a reference; do not duplicate the goal or transactions.";
        }
        const toInsert = starterIdeas.filter((idea) => !titles.has(idea.title.toLowerCase()));
        for (const idea of toInsert) {
          const description = idea.category === "savings_goal" ? idea.description + "\n\n" + savingsContext : idea.description;
          const { error: insertError } = await db.from("pruden_ideas").insert({
            owner_id: user.id, title: idea.title, description, source: "manual", category: idea.category,
            priority: idea.priority, time_horizon: idea.category === "college_personal" ? "short_term" : idea.category === "savings_goal" ? "mid_term" : "long_term",
            expected_value: idea.category === "income_opportunity" ? "Potential side income; unvalidated" : "",
            estimated_cost_kes: null, evidence: "Seeded from founder-provided 2026 plans; status remains unverified until updated.",
            risks: idea.category === "income_opportunity" ? "Camera loan not confirmed; do not treat as active business." : "",
            strategic_fit: idea.category === "income_opportunity" ? "revenue" : "learning",
            review_status: "new", decision_status: "pending", implementation_status: "not_planned"
          });
          if (insertError) throw insertError;
        }
      } catch (cause) {
        if (alive) setError((current) => current || (cause instanceof Error ? "Idea initialization: " + cause.message : "Idea initialization failed."));
      } finally { if (alive) setSeeding(false); }
    })();
    return () => { alive = false; };
  }, [user.id]);

  const filtered = useMemo(() => entries.filter((entry) => [entry.journal_date, entry.summary, entry.completed_work, entry.idea_updates, entry.decisions_lessons, entry.blockers, entry.next_actions].join(" ").toLowerCase().includes(search.toLowerCase())), [entries, search]);

  async function buildFromRecords() {
    setError(""); setNotice("");
    const date = draft.journal_date || todayNairobi();
    try {
      const start = new Date(date + "T00:00:00+03:00").toISOString();
      const end = new Date(new Date(date + "T00:00:00+03:00").getTime() + 86400000).toISOString();
      const db = requireSupabase();
      const [auditResult, taskResult, projectResult] = await Promise.all([
        db.from("pruden_audit_events").select("action,entity_type,entity_id,details,created_at").eq("owner_id", user.id).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }).limit(200),
        db.from("pruden_tasks").select("title,status,updated_at").eq("owner_id", user.id).gte("updated_at", start).lt("updated_at", end).limit(200),
        db.from("pruden_projects").select("name,status,updated_at").eq("owner_id", user.id).gte("updated_at", start).lt("updated_at", end).limit(100)
      ]);
      if (auditResult.error) throw auditResult.error;
      if (taskResult.error) throw taskResult.error;
      if (projectResult.error) throw projectResult.error;
      const audits = auditResult.data || [];
      const tasks = taskResult.data || [];
      const projects = projectResult.data || [];
      const actions = audits.map((row: any) => titleCase(String(row.action || "activity")) + " (" + String(row.entity_type || "record") + ")").slice(0, 25);
      const completed = tasks.filter((row: any) => row.status === "completed").map((row: any) => row.title);
      const changedTasks = tasks.filter((row: any) => row.status !== "completed").map((row: any) => row.title + " — " + titleCase(row.status));
      const changedProjects = projects.map((row: any) => row.name + " — " + titleCase(row.status));
      const summary = audits.length + " audit event(s), " + tasks.length + " task update(s), and " + projects.length + " project update(s) were found in available PTMS records for " + date + ".";
      setDraft((current) => ({ ...current, journal_date: date, summary, completed_work: [...completed.map((x: string) => "Completed task: " + x), ...actions].join("\n"), idea_updates: "", decisions_lessons: "", financial_notes: "No financial changes are included automatically. Add them only after checking the Finance records.", blockers: "", next_actions: [...changedTasks.map((x: string) => "Review task: " + x), ...changedProjects.map((x: string) => "Review project: " + x)].join("\n") }));
      setSource("ivy");
      setNotice("Built a draft from available PTMS audit, task, and project records. Review it before saving; records outside PTMS are not included.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build a summary from PTMS records.");
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const date = draft.journal_date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid journal date.");
      if (!draft.summary.trim()) throw new Error("Add a short summary before saving.");
      const db = requireSupabase();
      const { data, error: writeError } = await db.from("pruden_daily_journal").upsert({
        owner_id: user.id, journal_date: date, timezone: "Africa/Nairobi",
        summary: draft.summary.trim().slice(0, 5000), completed_work: draft.completed_work.trim().slice(0, 10000),
        idea_updates: draft.idea_updates.trim().slice(0, 5000), decisions_lessons: draft.decisions_lessons.trim().slice(0, 5000),
        financial_notes: draft.financial_notes.trim().slice(0, 3000), blockers: draft.blockers.trim().slice(0, 3000),
        next_actions: draft.next_actions.trim().slice(0, 5000), source_activity: [], source,
        updated_at: new Date().toISOString()
      }, { onConflict: "owner_id,journal_date" }).select("*").single();
      if (writeError) throw writeError;
      try {
        await db.from("pruden_audit_events").insert({ owner_id: user.id, actor_id: user.id, action: "daily_journal.saved", entity_type: "daily_journal", entity_id: data.id, details: { journal_date: date, source } });
      } catch { /* Journal write and audit write are separate; do not misreport audit success. */ }
      setNotice("Daily journal saved for " + date + " (" + data.id + ").");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daily journal could not be saved.");
    } finally { setSaving(false); }
  }

  function editEntry(entry: JournalEntry) {
    setDraft({ journal_date: entry.journal_date, timezone: entry.timezone, summary: entry.summary, completed_work: entry.completed_work, idea_updates: entry.idea_updates, decisions_lessons: entry.decisions_lessons, financial_notes: entry.financial_notes, blockers: entry.blockers, next_actions: entry.next_actions });
    setSource(entry.source === "scheduled" ? "ivy" : entry.source);
    setNotice("Loaded the saved entry for review. Saving updates the existing date entry; the prior text is not retained as a separate version.");
  }

  return <section className="module-page">
    <div className="module-title-row"><div><p className="eyebrow"><BookOpenText size={13} /> OPERATIONS / DOCUMENTATION</p><h1>Ideas Register & Daily Journal</h1><p className="welcome-subtitle">Keep personal goals, community work, income opportunities, and verified daily activity in one searchable, owner-scoped record.</p></div><button className="secondary-button" onClick={() => { setDraft(blank()); setSource("manual"); setNotice(""); }}><RefreshCw size={14} /> New entry</button></div>
    {error && <div role="alert" style={{ padding: 12, border: "1px solid #ef444455", borderRadius: 10, color: "#f87171", marginBottom: 14, display: "flex", gap: 8 }}><CircleAlert size={16} />{error}</div>}
    {notice && <div role="status" style={{ padding: 12, border: "1px solid #10b98155", borderRadius: 10, color: "#34d399", marginBottom: 14, display: "flex", gap: 8 }}><Check size={16} />{notice}</div>}
    <div className="panel" style={{ padding: 16, borderRadius: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}><div><p className="eyebrow"><Sparkles size={13} /> IVY DAILY BRIEF</p><h2 style={{ margin: 0, fontSize: 18 }}>Record what actually happened</h2><p className="welcome-subtitle">Use available PTMS audit/task/project records as evidence; review the draft before saving.</p></div><button className="secondary-button" onClick={() => void buildFromRecords()}><CalendarClock size={14} /> Build from PTMS records</button></div>
      <form onSubmit={save} style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}><label style={label}>Journal date (Africa/Nairobi)<input style={field} type="date" required value={draft.journal_date} onChange={e => setDraft(v => ({ ...v, journal_date: e.target.value }))} /></label><label style={label}>Entry source<select style={field} value={source} onChange={e => setSource(e.target.value as "manual" | "ivy")}><option value="manual">Manual</option><option value="ivy">Ivy-assisted</option></select></label></div>
        <label style={label}>Daily summary<textarea style={{ ...field, minHeight: 78 }} required maxLength={5000} value={draft.summary} onChange={e => setDraft(v => ({ ...v, summary: e.target.value }))} placeholder="Briefly describe what happened today…" /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          <label style={label}>Completed work<textarea style={{ ...field, minHeight: 85 }} value={draft.completed_work} onChange={e => setDraft(v => ({ ...v, completed_work: e.target.value }))} /></label>
          <label style={label}>Ideas and project updates<textarea style={{ ...field, minHeight: 85 }} value={draft.idea_updates} onChange={e => setDraft(v => ({ ...v, idea_updates: e.target.value }))} /></label>
          <label style={label}>Decisions and lessons<textarea style={{ ...field, minHeight: 85 }} value={draft.decisions_lessons} onChange={e => setDraft(v => ({ ...v, decisions_lessons: e.target.value }))} /></label>
          <label style={label}>Financial notes (verified only)<textarea style={{ ...field, minHeight: 85 }} value={draft.financial_notes} onChange={e => setDraft(v => ({ ...v, financial_notes: e.target.value }))} /></label>
          <label style={label}>Blockers and pending items<textarea style={{ ...field, minHeight: 85 }} value={draft.blockers} onChange={e => setDraft(v => ({ ...v, blockers: e.target.value }))} /></label>
          <label style={label}>Next actions<textarea style={{ ...field, minHeight: 85 }} value={draft.next_actions} onChange={e => setDraft(v => ({ ...v, next_actions: e.target.value }))} /></label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="secondary-button" onClick={() => void buildFromRecords()}><RefreshCw size={14} /> Refresh evidence</button><button className="primary-button" type="submit" disabled={saving}><Save size={14} /> {saving ? "Saving…" : "Save daily entry"}</button></div>
      </form>
    </div>
    <div className="panel" style={{ padding: 16, borderRadius: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><p className="eyebrow"><Lightbulb size={13} /> IDEAS REGISTER</p><h2 style={{ margin: 0, fontSize: 18 }}>2026 ideas captured</h2><p className="welcome-subtitle">Initialization is idempotent by title; savings and Finance records are never copied into the ledger.</p></div><button className="secondary-button" onClick={() => window.location.reload()} disabled={seeding}><RefreshCw size={14} /> {seeding ? "Checking existing ideas…" : "Refresh ideas"}</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginTop: 12 }}>
        {starterIdeas.map((idea) => <article key={idea.title} style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 11, padding: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><span style={{ fontSize: 10, color: "var(--muted, #8291a9)" }}>{titleCase(idea.category)}</span><span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800 }}>{idea.priority}</span></div><h3 style={{ margin: "0 0 7px", fontSize: 14 }}>{idea.title}</h3><p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--muted, #8291a9)" }}>{idea.description}</p></article>)}
      </div>
    </div>
    <div className="panel" style={{ padding: 16, borderRadius: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><p className="eyebrow">CHRONOLOGICAL HISTORY</p><h2 style={{ margin: 0, fontSize: 18 }}>Saved daily entries</h2></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button></div>
      <label style={{ ...label, marginTop: 12 }}><span>Search entries</span><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Search size={15} /><input style={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dates, decisions, projects…" /></span></label>
      {loading ? <p className="welcome-subtitle">Loading journal…</p> : filtered.length === 0 ? <p className="welcome-subtitle">No saved daily entries yet. Create one above.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{filtered.map((entry) => <article key={entry.id} style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><h3 style={{ margin: 0, fontSize: 15 }}>{entry.journal_date}</h3><small style={{ color: "var(--muted, #8291a9)" }}>Africa/Nairobi · {titleCase(entry.source)} · Updated {new Date(entry.updated_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</small></div><button className="secondary-button" onClick={() => editEntry(entry)}>Review / edit</button></div>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{entry.summary}</p>
        {entry.completed_work && <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}><strong>Work:</strong> {entry.completed_work}</p>}
        {entry.blockers && <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}><strong>Blockers:</strong> {entry.blockers}</p>}
        {entry.next_actions && <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}><strong>Next:</strong> {entry.next_actions}</p>}
      </article>)}</div>}
    </div>
    <p className="welcome-subtitle" style={{ marginTop: 12 }}>Supabase Cron is scheduled for 6:00 PM Africa/Nairobi. It records a factual summary from available PTMS records and skips the date if a manual or Ivy entry already exists. Check the scheduled-run history for success or failure.</p>
  </section>;
}
