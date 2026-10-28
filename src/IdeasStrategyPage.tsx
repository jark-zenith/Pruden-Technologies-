import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, BrainCircuit, CalendarClock, Check, CircleAlert, Clock3, FolderKanban, Lightbulb, Plus, RefreshCw, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { createProject, createTask, listProjects, type Project } from "./lib/operations";
import { requireSupabase } from "./lib/supabase";

type Priority = "P0" | "P1" | "P2" | "P3";
type Idea = {
  id: string; owner_id: string; title: string; description: string; source: "manual" | "ivy" | "workforce";
  category: string; priority: Priority; time_horizon: string; expected_value: string; estimated_cost_kes: number | null;
  evidence: string; risks: string; strategic_fit: string; review_status: string; decision_status: string;
  implementation_status: string; target_date: string | null; created_at: string; updated_at: string;
};
type Initiative = {
  id: string; owner_id: string; idea_id: string; title: string; objective: string; status: string;
  owner_label: string; target_date: string | null; estimated_budget_kes: number | null;
  approved_budget_kes: number | null; success_criteria: string; linked_project_id: string | null;
  created_at: string; updated_at: string;
};
type IdeaForm = {
  title: string; description: string; category: string; priority: Priority; time_horizon: string;
  expected_value: string; estimated_cost_kes: string; risks: string; strategic_fit: string; target_date: string;
};
const blankForm: IdeaForm = {
  title: "", description: "", category: "product", priority: "P2", time_horizon: "short_term",
  expected_value: "", estimated_cost_kes: "", risks: "", strategic_fit: "innovation", target_date: ""
};
const horizons: Record<string, string> = {
  immediate: "Immediate · 0–7 days", short_term: "Short-term · 7–30 days",
  mid_term: "Mid-term · 1–3 months", long_term: "Long-term · 3–12+ months"
};
const priorityRank: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const taskPriority: Record<Priority, "critical" | "high" | "medium" | "low"> = { P0: "critical", P1: "high", P2: "medium", P3: "low" };
const money = (amount: number | null | undefined) => amount == null
  ? "Not estimated"
  : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);
const fieldStyle = { width: "100%", minWidth: 0, padding: "10px 12px", border: "1px solid var(--border, #2b3a50)", borderRadius: 9, background: "var(--surface, #101827)", color: "inherit", font: "inherit" } as const;
const buttonStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 12px", border: "1px solid var(--border, #2b3a50)", borderRadius: 9, background: "var(--surface, #101827)", color: "inherit", cursor: "pointer", font: "inherit", fontSize: 12 } as const;
const labelStyle = { display: "grid", gap: 6, fontSize: 12, color: "var(--muted, #8291a9)" } as const;

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "red" | "amber" | "blue" | "green" | "purple" }) {
  const tones = {
    neutral: { bg: "#64748b20", fg: "var(--muted, #94a3b8)" },
    red: { bg: "#ef444420", fg: "#f87171" }, amber: { bg: "#f59e0b20", fg: "#fbbf24" },
    blue: { bg: "#3b82f620", fg: "#60a5fa" }, green: { bg: "#10b98120", fg: "#34d399" },
    purple: { bg: "#8b5cf620", fg: "#a78bfa" }
  };
  const selected = tones[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 8px", background: selected.bg, color: selected.fg, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

function priorityTone(priority: Priority): "red" | "amber" | "blue" | "neutral" {
  return priority === "P0" ? "red" : priority === "P1" ? "amber" : priority === "P2" ? "blue" : "neutral";
}

export function IdeasDashboardWidget({ user, onOpen }: { user: User; onOpen: () => void }) {
  const [items, setItems] = useState<Idea[]>([]);
  const [counts, setCounts] = useState({ pending: 0, active: 0 });
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data, error } = await requireSupabase().from("pruden_ideas").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(100);
        if (error) throw error;
        const rows = (data || []) as Idea[];
        if (!alive) return;
        setItems(rows.filter(row => !["rejected", "deferred"].includes(row.decision_status)).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 3));
        setCounts({
          pending: rows.filter(row => row.decision_status === "pending").length,
          active: rows.filter(row => ["in_progress", "blocked"].includes(row.implementation_status)).length
        });
        setAvailable(true);
      } catch {
        if (alive) setAvailable(false);
      }
    })();
    return () => { alive = false; };
  }, [user.id]);
  return <section className="panel" style={{ margin: "0 0 22px", padding: 20, borderRadius: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
      <div>
        <p className="eyebrow"><Lightbulb size={13} /> IDEAS & STRATEGY</p>
        <h2 style={{ margin: 0, fontSize: 20 }}>From ideas to execution</h2>
        <p className="welcome-subtitle">Capture opportunities, choose the next priority, and turn approved ideas into accountable work.</p>
      </div>
      <button className="primary-button" onClick={onOpen}><Plus size={15} /> Open Ideas Hub <ArrowRight size={14} /></button>
    </div>
    {available === false ? <p style={{ color: "var(--muted, #8291a9)", fontSize: 12, marginBottom: 0 }}>Ideas storage is not available yet. Apply the Ideas & Strategy database migration to enable live metrics.</p> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginTop: 14 }}>
        <div style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 10, padding: 12 }}><small style={{ color: "var(--muted, #8291a9)" }}>Awaiting decision</small><div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>{available === null ? "—" : counts.pending}</div></div>
        <div style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 10, padding: 12 }}><small style={{ color: "var(--muted, #8291a9)" }}>Active initiatives</small><div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>{available === null ? "—" : counts.active}</div></div>
        <div style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 10, padding: 12 }}><small style={{ color: "var(--muted, #8291a9)" }}>Priority queue</small><div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>{available === null ? "—" : items.length}</div></div>
      </div>}
    {items.length > 0 && <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{items.map(item => <button key={item.id} onClick={onOpen} style={{ ...buttonStyle, width: "100%", justifyContent: "space-between", textAlign: "left", padding: 11 }}><span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><Pill tone={priorityTone(item.priority)}>{item.priority}</Pill><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span></span><ArrowRight size={14} /></button>)}</div>}
  </section>;
}

export default function IdeasStrategyPage({ user }: { user: User }) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<IdeaForm>(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterHorizon, setFilterHorizon] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const db = () => requireSupabase();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ideaResult, initiativeResult, projectRows] = await Promise.all([
        db().from("pruden_ideas").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(300),
        db().from("pruden_initiatives").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(200),
        listProjects(user)
      ]);
      if (ideaResult.error) throw ideaResult.error;
      if (initiativeResult.error) throw initiativeResult.error;
      setIdeas((ideaResult.data || []) as Idea[]);
      setInitiatives((initiativeResult.data || []) as Initiative[]);
      setProjects(projectRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ideas could not be loaded. Check that the database migration is applied and RLS is configured.");
    } finally { setLoading(false); }
  }, [user, refreshKey]);
  useEffect(() => { void load(); }, [load]);

  const filteredIdeas = useMemo(() => ideas.filter(idea => {
    const matchesSearch = (idea.title + " " + idea.description + " " + idea.category).toLowerCase().includes(search.toLowerCase());
    const matchesHorizon = filterHorizon === "all" || idea.time_horizon === filterHorizon;
    const matchesStatus = filterStatus === "all" || (filterStatus === "pending" ? idea.decision_status === "pending" : filterStatus === "approved" ? idea.decision_status === "approved" : filterStatus === "active" ? ["in_progress", "blocked"].includes(idea.implementation_status) : idea.decision_status === filterStatus);
    return matchesSearch && matchesHorizon && matchesStatus;
  }), [ideas, search, filterHorizon, filterStatus]);

  async function saveIdea(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const title = form.title.trim();
      if (!title || title.length > 160) throw new Error("Give the idea a title between 1 and 160 characters.");
      const estimate = form.estimated_cost_kes.trim() ? Number(form.estimated_cost_kes) : null;
      if (estimate !== null && (!Number.isFinite(estimate) || estimate < 0)) throw new Error("Estimated cost must be zero or greater.");
      const { error: insertError } = await db().from("pruden_ideas").insert({
        owner_id: user.id, title, description: form.description.trim(), source: "manual", category: form.category,
        priority: form.priority, time_horizon: form.time_horizon, expected_value: form.expected_value.trim(),
        estimated_cost_kes: estimate, evidence: "", risks: form.risks.trim(), strategic_fit: form.strategic_fit,
        review_status: "new", decision_status: "pending", implementation_status: "not_planned",
        target_date: form.target_date || null
      });
      if (insertError) throw insertError;
      setForm(blankForm); setShowForm(false); setNotice("Idea saved to your workspace."); setRefreshKey(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Idea could not be saved."); }
    finally { setSaving(false); }
  }

  async function generateWithIvy() {
    setGenerating(true); setError(""); setNotice("");
    try {
      const { data: sessionData, error: sessionError } = await db().auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.access_token) throw new Error("Your authenticated session is unavailable. Sign in again and retry.");
      const prompt = [
        "Propose ONE practical, high-value initiative for PRUDEN Technologies based on the current PTMS workspace.",
        "Prioritize reliability, customer value, revenue, cost control, security, or delivery. Do not claim to have inspected data not supplied.",
        "Return these exact labeled fields: TITLE:, CATEGORY: (product, ai_research, engineering, security, finance, operations, marketing, partnerships, infrastructure), PRIORITY: (P0, P1, P2, P3), HORIZON: (immediate, short_term, mid_term, long_term), EXPECTED VALUE:, ESTIMATED COST KES: (number or unknown), DESCRIPTION:, RISKS:, SUCCESS CRITERIA:.",
        "Do not invent current balances, incidents, users, or production failures. Mark unknowns explicitly. A recommendation is not an approval.",
        "Known context: PTMS has project/task management, Finance, CRM, Approvals, and an AI Workforce. Current user asks for an integrated Ideas & Strategic Planning module."
      ].join("\n");
      const response = await fetch("/api/ivy/idea", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: prompt, accessToken: sessionData.session.access_token, workspace: { projects: projects.map(p => ({ name: p.name, status: p.status })) } })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ivy could not generate a proposal. Check the configured provider and server logs.");
      const reply = String(data.output || data.reply || "").trim();
      if (!reply) throw new Error("Ivy returned an empty proposal.");
      const extract = (label: string) => new RegExp("^" + label + ":\\s*(.*)$", "im").exec(reply)?.[1]?.trim() || "";
      const title = extract("TITLE").replace(/^["']|["']$/g, "").slice(0, 160) || "Ivy strategic proposal";
      const categoryCandidate = extract("CATEGORY").toLowerCase().replace(/[^a-z_]/g, "");
      const allowedCategories = ["product","ai_research","engineering","security","finance","operations","marketing","partnerships","infrastructure"];
      const priorityCandidate = extract("PRIORITY").toUpperCase();
      const horizonCandidate = extract("HORIZON").toLowerCase().replace(/[^a-z_]/g, "");
      const costRaw = extract("ESTIMATED COST KES").replace(/,/g, "");
      const cost = /^\\d+(?:\\.\\d+)?$/.test(costRaw) ? Number(costRaw) : null;
      const description = extract("DESCRIPTION") || reply;
      const risks = extract("RISKS");
      const expected = extract("EXPECTED VALUE");
      const success = extract("SUCCESS CRITERIA");
      const { error: insertError } = await db().from("pruden_ideas").insert({
        owner_id: user.id, title, description: reply, source: "ivy",
        category: allowedCategories.includes(categoryCandidate) ? categoryCandidate : "operations",
        priority: (["P0","P1","P2","P3"].includes(priorityCandidate) ? priorityCandidate : "P2"),
        time_horizon: (["immediate","short_term","mid_term","long_term"].includes(horizonCandidate) ? horizonCandidate : "short_term"),
        expected_value: expected || "Needs validation", estimated_cost_kes: cost, evidence: "AI-generated proposal. Validate assumptions and cost before approval.",
        risks: [risks, success ? "Success criteria: " + success : ""].filter(Boolean).join("\n"),
        strategic_fit: "innovation", review_status: "under_review", decision_status: "pending",
        implementation_status: "not_planned", target_date: null
      });
      if (insertError) throw insertError;
      setNotice("Ivy's proposal was saved as a draft. It has not been approved or implemented."); setRefreshKey(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Ivy proposal failed."); }
    finally { setGenerating(false); }
  }

  async function decideIdea(idea: Idea, decision: "approved" | "rejected" | "deferred") {
    setSaving(true); setError(""); setNotice("");
    try {
      const { error: updateError } = await db().from("pruden_ideas").update({ decision_status: decision, review_status: "reviewed", implementation_status: decision === "approved" ? "planned" : idea.implementation_status, updated_at: new Date().toISOString() }).eq("id", idea.id).eq("owner_id", user.id);
      if (updateError) throw updateError;
      if (decision === "approved" && !initiatives.some(item => item.idea_id === idea.id)) {
        const { error: initiativeError } = await db().from("pruden_initiatives").insert({
          owner_id: user.id, idea_id: idea.id, title: idea.title, objective: idea.description,
          status: "planned", owner_label: "Founder", target_date: idea.target_date,
          estimated_budget_kes: idea.estimated_cost_kes, approved_budget_kes: null,
          success_criteria: "", linked_project_id: null
        });
        if (initiativeError) throw initiativeError;
      }
      setNotice(decision === "approved" ? "Idea approved and added to the initiatives roadmap. No spending or deployment was triggered." : decision === "rejected" ? "Idea rejected." : "Idea deferred for later review.");
      setRefreshKey(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Decision could not be saved."); }
    finally { setSaving(false); }
  }

  async function createProjectFor(initiative: Initiative) {
    setSaving(true); setError(""); setNotice("");
    try {
      const idea = ideas.find(item => item.id === initiative.idea_id);
      const created = await createProject(user, { name: initiative.title.slice(0, 120), description: initiative.objective || "", status: "planned", priority: idea ? taskPriority[idea.priority] : "medium", due_date: initiative.target_date });
      const { error: updateError } = await db().from("pruden_initiatives").update({ linked_project_id: created.id, updated_at: new Date().toISOString() }).eq("id", initiative.id).eq("owner_id", user.id);
      if (updateError) throw updateError;
      setNotice("Project created and linked to the initiative."); setRefreshKey(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Project could not be created or linked. Check Projects and audit permissions."); }
    finally { setSaving(false); }
  }

  async function createFirstTask(initiative: Initiative) {
    setSaving(true); setError(""); setNotice("");
    try {
      const idea = ideas.find(item => item.id === initiative.idea_id);
      await createTask(user, { title: ("Define scope and success criteria: " + initiative.title).slice(0, 200), description: initiative.objective || "", project_id: initiative.linked_project_id, status: "planned", priority: idea ? taskPriority[idea.priority] : "medium", assigned_to: "Founder", due_date: initiative.target_date });
      setNotice("Initial planning task created in the existing Tasks module."); setRefreshKey(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Task could not be created."); }
    finally { setSaving(false); }
  }

  async function updateInitiativeStatus(initiative: Initiative, status: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      const { error: updateError } = await db().from("pruden_initiatives").update({ status, updated_at: new Date().toISOString() }).eq("id", initiative.id).eq("owner_id", user.id);
      if (updateError) throw updateError;
      if (status === "completed") {
        const { error: ideaError } = await db().from("pruden_ideas").update({ implementation_status: "completed", updated_at: new Date().toISOString() }).eq("id", initiative.idea_id).eq("owner_id", user.id);
        if (ideaError) throw ideaError;
      }
      setNotice("Initiative status updated."); setRefreshKey(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Initiative status could not be updated."); }
    finally { setSaving(false); }
  }

  return <section className="module-page">
    <div className="module-title-row">
      <div><p className="eyebrow"><Lightbulb size={13} /> STRATEGY / OPPORTUNITY PIPELINE</p><h1>Ideas & Strategic Planning</h1><p className="welcome-subtitle">Capture ideas, review Ivy's recommendations, and turn approved opportunities into planned work.</p></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button style={buttonStyle} onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
        <button className="primary-button" onClick={() => { setShowForm(v => !v); setError(""); }}><Plus size={15} /> New idea</button>
      </div>
    </div>

    {error && <div role="alert" style={{ padding: 12, border: "1px solid #ef444455", borderRadius: 10, color: "#f87171", marginBottom: 14, display: "flex", gap: 8 }}><CircleAlert size={16} /> <span>{error}</span></div>}
    {notice && <div role="status" style={{ padding: 12, border: "1px solid #10b98155", borderRadius: 10, color: "#34d399", marginBottom: 14, display: "flex", gap: 8 }}><Check size={16} /> <span>{notice}</span></div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginBottom: 18 }}>
      {[
        { label: "Ideas captured", value: ideas.length, icon: Lightbulb },
        { label: "Awaiting decision", value: ideas.filter(item => item.decision_status === "pending").length, icon: Clock3 },
        { label: "Active initiatives", value: initiatives.filter(item => ["in_progress","blocked"].includes(item.status)).length, icon: Target },
        { label: "Overdue actions", value: initiatives.filter(item => item.target_date && item.target_date < new Date().toISOString().slice(0,10) && !["completed","cancelled"].includes(item.status)).length, icon: CalendarClock }
      ].map(metric => { const Icon = metric.icon; return <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon blue"><Icon size={16} /></span></div><div className="metric-value">{loading ? "—" : String(metric.value).padStart(2,"0")}</div><div className="metric-foot"><span className="metric-note">Persisted workspace records</span></div></article>; })}
    </div>

    {showForm && <form onSubmit={saveIdea} className="panel" style={{ padding: 18, borderRadius: 14, marginBottom: 18, display: "grid", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><h2 style={{ margin: 0, fontSize: 18 }}>Capture a new idea</h2><button type="button" style={buttonStyle} aria-label="Close idea form" onClick={() => setShowForm(false)}><X size={15} /></button></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
        <label style={labelStyle}>Idea title<input style={fieldStyle} required maxLength={160} value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="What should we improve or build?" /></label>
        <label style={labelStyle}>Category<select style={fieldStyle} value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}>{["product","ai_research","engineering","security","finance","operations","marketing","partnerships","infrastructure"].map(v => <option key={v} value={v}>{v.replace(/_/g," ")}</option>)}</select></label>
        <label style={labelStyle}>Priority<select style={fieldStyle} value={form.priority} onChange={e => setForm(v => ({ ...v, priority: e.target.value as Priority }))}><option value="P0">P0 · Critical</option><option value="P1">P1 · High</option><option value="P2">P2 · Normal</option><option value="P3">P3 · Low</option></select></label>
        <label style={labelStyle}>Time horizon<select style={fieldStyle} value={form.time_horizon} onChange={e => setForm(v => ({ ...v, time_horizon: e.target.value }))}>{Object.entries(horizons).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label style={labelStyle}>Estimated cost (KES)<input style={fieldStyle} type="number" min="0" step="0.01" value={form.estimated_cost_kes} onChange={e => setForm(v => ({ ...v, estimated_cost_kes: e.target.value }))} placeholder="Leave blank if unknown" /></label>
        <label style={labelStyle}>Target date<input style={fieldStyle} type="date" value={form.target_date} onChange={e => setForm(v => ({ ...v, target_date: e.target.value }))} /></label>
        <label style={labelStyle}>Strategic fit<select style={fieldStyle} value={form.strategic_fit} onChange={e => setForm(v => ({ ...v, strategic_fit: e.target.value }))}>{["revenue","cost_reduction","reliability","growth","learning","innovation","security"].map(v => <option key={v} value={v}>{v.replace(/_/g," ")}</option>)}</select></label>
        <label style={labelStyle}>Expected value<input style={fieldStyle} value={form.expected_value} onChange={e => setForm(v => ({ ...v, expected_value: e.target.value }))} placeholder="What benefit should this deliver?" /></label>
      </div>
      <label style={labelStyle}>Description<textarea style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }} value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} placeholder="Problem, opportunity, and proposed approach" /></label>
      <label style={labelStyle}>Risks and dependencies<textarea style={{ ...fieldStyle, minHeight: 65, resize: "vertical" }} value={form.risks} onChange={e => setForm(v => ({ ...v, risks: e.target.value }))} placeholder="Unknowns, blockers, dependencies, or constraints" /></label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" style={buttonStyle} onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save idea"}</button></div>
    </form>}

    <div className="panel" style={{ padding: 16, borderRadius: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div><p className="eyebrow">OPPORTUNITY PIPELINE</p><h2 style={{ margin: 0, fontSize: 18 }}>Ideas register</h2></div>
        <button style={buttonStyle} onClick={() => void generateWithIvy()} disabled={generating}><BrainCircuit size={15} /> {generating ? "Asking Ivy…" : "Ask Ivy for an idea"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 12 }}>
        <input style={fieldStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas…" aria-label="Search ideas" />
        <select style={fieldStyle} value={filterHorizon} onChange={e => setFilterHorizon(e.target.value)} aria-label="Filter by time horizon"><option value="all">All time horizons</option>{Object.entries(horizons).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select style={fieldStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="pending">Awaiting decision</option><option value="approved">Approved</option><option value="active">Active / blocked</option><option value="deferred">Deferred</option><option value="rejected">Rejected</option></select>
      </div>
      {loading ? <p className="welcome-subtitle">Loading saved ideas…</p> : filteredIdeas.length === 0 ? <div style={{ padding: 22, textAlign: "center", color: "var(--muted, #8291a9)" }}><Lightbulb size={24} /><p>No matching ideas yet. Capture one manually or ask Ivy to propose an opportunity.</p></div> :
        <div style={{ display: "grid", gap: 10 }}>{filteredIdeas.map(idea => {
          const linkedInitiative = initiatives.find(item => item.idea_id === idea.id);
          const decisionTone = idea.decision_status === "approved" ? "green" : idea.decision_status === "rejected" ? "red" : idea.decision_status === "deferred" ? "neutral" : "amber";
          return <article key={idea.id} style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, minWidth: 0, flex: 1 }}><Pill tone={priorityTone(idea.priority)}>{idea.priority}</Pill><div style={{ minWidth: 0 }}><h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{idea.title}</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><Pill tone={idea.source === "ivy" ? "purple" : "neutral"}>{idea.source === "ivy" ? "Ivy-generated" : idea.source === "workforce" ? "Workforce" : "Manual"}</Pill><Pill>{horizons[idea.time_horizon] || idea.time_horizon}</Pill><Pill tone={decisionTone}>{idea.decision_status.replace(/_/g," ")}</Pill><Pill>{idea.category.replace(/_/g," ")}</Pill></div></div></div>
              <div style={{ textAlign: "right", color: "var(--muted, #8291a9)", fontSize: 11 }}>{money(idea.estimated_cost_kes)}<div style={{ marginTop: 4 }}>{idea.target_date || "No target date"}</div></div>
            </div>
            {idea.description && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted, #a0aec0)", whiteSpace: "pre-wrap" }}>{idea.description}</p>}
            {idea.expected_value && <p style={{ margin: 0, fontSize: 12 }}><strong>Expected value:</strong> {idea.expected_value}</p>}
            {idea.risks && <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #8291a9)" }}><strong>Risks / notes:</strong> {idea.risks}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {idea.decision_status === "pending" && <><button style={buttonStyle} disabled={saving} onClick={() => void decideIdea(idea, "approved")}><ShieldCheck size={14} /> Approve & plan</button><button style={buttonStyle} disabled={saving} onClick={() => void decideIdea(idea, "deferred")}>Defer</button><button style={buttonStyle} disabled={saving} onClick={() => void decideIdea(idea, "rejected")}><X size={14} /> Reject</button></>}
              {linkedInitiative && <Pill tone="green">Initiative: {linkedInitiative.status.replace(/_/g," ")}</Pill>}
            </div>
          </article>;
        })}</div>}
    </div>

    <div className="panel" style={{ padding: 16, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}><div><p className="eyebrow">APPROVED ROADMAP</p><h2 style={{ margin: 0, fontSize: 18 }}>Initiatives & delivery</h2></div><Pill tone="blue">{initiatives.length} initiatives</Pill></div>
      {initiatives.length === 0 ? <p className="welcome-subtitle">Approve an idea to add it to the roadmap. Approval creates a plan, not an automatic deployment or spending action.</p> :
        <div style={{ display: "grid", gap: 10 }}>{initiatives.map(initiative => {
          const linkedProject = projects.find(project => project.id === initiative.linked_project_id);
          const idea = ideas.find(item => item.id === initiative.idea_id);
          return <article key={initiative.id} style={{ border: "1px solid var(--border, #2b3a50)", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{initiative.title}</h3><p style={{ margin: 0, color: "var(--muted, #8291a9)", fontSize: 12 }}>{initiative.objective}</p></div><Pill tone={initiative.status === "completed" ? "green" : initiative.status === "blocked" ? "red" : "blue"}>{initiative.status.replace(/_/g," ")}</Pill></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "var(--muted, #8291a9)", fontSize: 11 }}><span>Estimated: {money(initiative.estimated_budget_kes)}</span><span>· Approved: {money(initiative.approved_budget_kes)}</span><span>· Target: {initiative.target_date || "Not set"}</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {linkedProject ? <Pill tone="green"><FolderKanban size={12} /> Linked: {linkedProject.name}</Pill> : <button style={buttonStyle} disabled={saving} onClick={() => void createProjectFor(initiative)}><FolderKanban size={14} /> Create & link project</button>}
              <button style={buttonStyle} disabled={saving} onClick={() => void createFirstTask(initiative)}><Plus size={14} /> Create planning task</button>
              {initiative.status !== "in_progress" && initiative.status !== "completed" && <button style={buttonStyle} disabled={saving} onClick={() => void updateInitiativeStatus(initiative, "in_progress")}>Start</button>}
              {initiative.status !== "completed" && <button style={buttonStyle} disabled={saving} onClick={() => void updateInitiativeStatus(initiative, "completed")}><Check size={14} /> Mark complete</button>}
              {idea && <Pill>{idea.priority} · {horizons[idea.time_horizon] || idea.time_horizon}</Pill>}
            </div>
          </article>;
        })}</div>}
    </div>
    <footer className="footer-note"><span>PRUDEN COMMAND <b>·</b> IDEAS → DECISIONS → DELIVERY</span><span><Sparkles size={13} /> Estimates are not actual financial records.</span></footer>
  </section>;
}
