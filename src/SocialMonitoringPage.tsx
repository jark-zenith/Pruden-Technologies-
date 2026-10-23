import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, ExternalLink, Instagram, Plus, RefreshCw, Trash2, Youtube, MessageCircle, Copy, Check } from "lucide-react";

type Platform = "Instagram" | "TikTok" | "YouTube" | "Facebook" | "LinkedIn" | "X" | "Other";
type Account = { id: string; platform: Platform; handle: string; url: string; goal: string; notes: string; checkedAt: string };
type LogEntry = { id: string; date: string; platform: Platform; metric: string; value: string; note: string };
const platforms: Platform[] = ["TikTok", "Instagram", "YouTube", "Facebook", "LinkedIn", "X", "Other"];
const STORAGE_KEY = "ptms-social-monitor-v1";
const LOG_KEY = "ptms-social-log-v1";
const emptyAccount = { platform: "TikTok" as Platform, handle: "", url: "", goal: "Audience growth", notes: "" };

export default function SocialMonitoringPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [form, setForm] = useState(emptyAccount);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState("");
  const [metric, setMetric] = useState("Followers");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    try {
      const storedAccounts = window.localStorage.getItem(STORAGE_KEY);
      const storedLogs = window.localStorage.getItem(LOG_KEY);
      if (storedAccounts) setAccounts(JSON.parse(storedAccounts) as Account[]);
      if (storedLogs) setLogs(JSON.parse(storedLogs) as LogEntry[]);
    } catch { /* Storage may be unavailable; this view remains usable for the session. */ }
  }, []);

  const saveAccounts = (next: Account[]) => { setAccounts(next); try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep current session usable. */ } };
  const saveLogs = (next: LogEntry[]) => { setLogs(next); try { window.localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch { /* Keep current session usable. */ } };

  const visibleAccounts = useMemo(() => accounts.filter((account) => filter === "All" || account.platform === filter), [accounts, filter]);
  const latestByAccount = (id: string) => logs.filter((entry) => entry.id === id);
  const prompt = useMemo(() => {
    const lines = accounts.map((account) => {
      const latest = logs.filter((entry) => entry.id === account.id).slice(0, 5);
      return account.platform + " " + account.handle + " (" + (account.url || "URL not provided") + ")\nGoal: " + account.goal + "\nNotes: " + (account.notes || "None") + "\nRecent manually logged metrics: " + (latest.length ? latest.map((entry) => entry.date + " " + entry.metric + "=" + entry.value + (entry.note ? " (" + entry.note + ")" : "")).join("; ") : "No metrics logged");
    }).join("\n\n");
    return "You are the PRUDEN Technologies social media analyst working with the AI Workforce. Analyze only the supplied information; do not claim you accessed live platform analytics. Identify trends, content experiments, audience-growth opportunities, risks, and a practical 7-day content plan. Separate observed facts from hypotheses. Recommend platform-specific tasks that a human can review.\n\nTracked accounts:\n" + (lines || "No social accounts have been added yet.") + "\n\nReturn: 1) executive summary, 2) account-by-account observations, 3) 3 content experiments, 4) 7-day action plan, 5) metrics to record next.";
  }, [accounts, logs]);

  const addAccount = () => {
    const handle = form.handle.trim();
    if (!handle) return;
    const account: Account = { ...form, handle, url: form.url.trim(), id: crypto.randomUUID(), checkedAt: new Date().toISOString() };
    saveAccounts([...accounts, account]);
    setSelected(account.id);
    setForm(emptyAccount);
    setShowForm(false);
  };

  const addMetric = () => {
    if (!selected || !value.trim()) return;
    const account = accounts.find((item) => item.id === selected);
    if (!account) return;
    const entry: LogEntry = { id: selected, date: new Date().toISOString().slice(0, 10), platform: account.platform, metric, value: value.trim(), note: note.trim() };
    saveLogs([entry, ...logs]);
    setValue(""); setNote("");
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  return <section className="module-page">
    <div className="module-title-row"><div><p className="eyebrow">PTMS / BUSINESS INTELLIGENCE</p><h1>Social Media Monitoring</h1><p className="welcome-subtitle">Track PRUDEN channels, record performance, and prepare focused analysis tasks for the AI Workforce.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={15} /> Add account</button></div>
    <div className="github-summary-grid">
      <article className="github-summary-card"><span>Tracked accounts</span><strong>{accounts.length}</strong><small>Saved in this browser</small></article>
      <article className="github-summary-card"><span>Metric records</span><strong>{logs.length}</strong><small>Manually recorded history</small></article>
      <article className="github-summary-card"><span>Platforms represented</span><strong>{new Set(accounts.map((account) => account.platform)).size}</strong><small>Across added accounts</small></article>
    </div>
    <div className="info-callout"><strong><Activity size={15} /> Data connection status: manual tracking</strong><p>Live follower counts, comments, reach and ad spend are not fetched automatically. This workspace stores account links and metrics in this browser only. Official platform API connections can be added after permissions and credentials are configured securely.</p></div>
    {showForm && <article className="github-project-detail-panel"><h2>Add social account</h2><div className="github-toolbar">
      <label className="field-label">Platform<select className="task-input" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as Platform })}>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field-label">Handle / account name<input className="task-input" value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} placeholder="@pruden..." /></label>
      <label className="field-label">Profile URL<input className="task-input" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." /></label>
      <label className="field-label">Primary goal<select className="task-input" value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })}><option>Audience growth</option><option>Leads and sales</option><option>Brand awareness</option><option>Community building</option><option>Content testing</option></select></label>
      <label className="field-label">Notes<input className="task-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Niche, audience, campaign..." /></label>
    </div><div className="modal-foot"><button className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" onClick={addAccount} disabled={!form.handle.trim()}>Save account</button></div></article>}
    <div className="github-toolbar"><div className="github-filters" role="group" aria-label="Filter by platform"><button className={filter === "All" ? "selected" : ""} onClick={() => setFilter("All")}>All</button>{platforms.map((platform) => <button key={platform} className={filter === platform ? "selected" : ""} onClick={() => setFilter(platform)}>{platform}</button>)}</div></div>
    <div className="github-project-grid">{visibleAccounts.map((account) => <article className="github-project-card" key={account.id}><div className="github-project-content"><div className="github-project-heading"><h2>{account.platform}</h2><span className="deployment-label configured"><i /> TRACKED</span></div><p className="github-project-meta"><strong>{account.handle}</strong> · Goal: {account.goal}</p>{account.notes && <p>{account.notes}</p>}{account.url && <p><a href={account.url} target="_blank" rel="noreferrer">{account.url} <ExternalLink size={12} /></a></p>}<p className="github-project-meta">Added {new Date(account.checkedAt).toLocaleDateString()}</p><div className="github-project-actions"><button onClick={() => setSelected(account.id)}><Activity size={14} /> Log metrics</button><button onClick={() => saveAccounts(accounts.filter((item) => item.id !== account.id))}><Trash2 size={14} /> Remove</button></div>{selected === account.id && <div className="metric-log-form"><label className="field-label">Metric<select className="task-input" value={metric} onChange={(event) => setMetric(event.target.value)}>{["Followers", "Views", "Reach", "Engagement rate", "Link clicks", "Leads", "Ad spend (KSh)", "Posts published"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Value<input className="task-input" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. 1250 or 4.8%" /></label><label className="field-label">Context<input className="task-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Campaign or date-range details" /></label><button className="primary-button" onClick={addMetric} disabled={!value.trim()}><Plus size={14} /> Save metric</button><div className="metric-history">{latestByAccount(account.id).slice(0, 5).map((entry, index) => <p key={entry.date + entry.metric + index}><strong>{entry.date} · {entry.metric}:</strong> {entry.value} {entry.note && "— " + entry.note}</p>)}{latestByAccount(account.id).length === 0 && <p>No metrics recorded yet.</p>}</div></div>}</div></article>)}{visibleAccounts.length === 0 && <article className="github-project-detail-panel"><h2>No accounts in this view</h2><p>Add a social account to begin tracking goals and recording metrics.</p></article>}</div>
    <article className="github-project-detail-panel"><h2><Bot size={17} /> AI Workforce analysis brief</h2><p>Copy this context into Ivy or your designated AI Workforce analyst. It asks the agent to analyze your records without pretending to have direct access to social platform APIs.</p><textarea className="task-input" rows={8} readOnly value={prompt} /><div className="github-project-actions"><button className="primary-button" onClick={() => void copyPrompt()}><Copy size={14} /> {copied ? <><Check size={14} /> Copied</> : "Copy AI analysis brief"}</button><button className="secondary-button" onClick={() => { setSelected(accounts[0]?.id || ""); if (accounts.length) document.getElementById("social-metrics")?.scrollIntoView({ behavior: "smooth" }); }}><RefreshCw size={14} /> Prepare next review</button></div></article>
    <footer className="footer-note"><span>PTMS · SOCIAL MEDIA INTELLIGENCE</span><span>Manual metrics · AI-assisted planning · API integrations pending</span></footer>
  </section>;
}
