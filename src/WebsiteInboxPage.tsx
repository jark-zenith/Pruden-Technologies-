import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, ExternalLink, Inbox, RefreshCw } from "lucide-react";
import { requireSupabase } from "./lib/supabase";

type InboxRecord = {
  id: string;
  source_site: string;
  source_url: string | null;
  submission_type: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  status: string;
  priority: string;
  is_read: boolean;
  response_notes: string;
  created_at: string;
};

const statuses = ["new", "in_review", "awaiting_reply", "resolved", "archived", "spam"];

export default function WebsiteInboxPage({ user }: { user: User }) {
  const [records, setRecords] = useState<InboxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<InboxRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: queryError } = await requireSupabase()
        .from("website_inbox").select("*").eq("owner_id", user.id)
        .order("created_at", { ascending: false }).limit(250);
      if (queryError) throw queryError;
      setRecords((data ?? []) as InboxRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the website inbox.");
    } finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { void load(); }, [load]);

  const openRecord = async (record: InboxRecord) => {
    setSelected(record);
    setNotes(record.response_notes || "");
    if (!record.is_read) {
      try {
        const { error: updateError } = await requireSupabase().from("website_inbox")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("id", record.id).eq("owner_id", user.id);
        if (updateError) throw updateError;
        setRecords(current => current.map(item => item.id === record.id ? { ...item, is_read: true } : item));
      } catch (err) { setError(err instanceof Error ? err.message : "Could not mark this item read."); }
    }
  };

  const saveRecord = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const { data, error: updateError } = await requireSupabase().from("website_inbox")
        .update({ status: selected.status, priority: selected.priority, response_notes: notes, is_read: true, read_at: new Date().toISOString() })
        .eq("id", selected.id).eq("owner_id", user.id).select("*").single();
      if (updateError) throw updateError;
      const updated = data as InboxRecord;
      setRecords(current => current.map(item => item.id === updated.id ? updated : item));
      setSelected(updated);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save inbox changes."); }
    finally { setSaving(false); }
  };

  const visible = records.filter(item => filter === "all" || (filter === "unread" ? !item.is_read : item.status === filter));
  const unread = records.filter(item => !item.is_read).length;
  const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return <div className="website-inbox-page"><style>{`
.website-inbox-page .inbox-layout{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(320px,1.15fr);gap:16px;margin-top:16px;align-items:start}
.website-inbox-page .inbox-list,.website-inbox-page .inbox-detail{min-width:0;overflow:hidden}
.website-inbox-page .inbox-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border,#273448)}
.website-inbox-page select,.website-inbox-page textarea{font:inherit;color:inherit;background:var(--surface,#101827);border:1px solid var(--border,#273448);border-radius:8px;padding:8px;max-width:100%}
.website-inbox-page .inbox-record{width:100%;display:flex;gap:10px;text-align:left;padding:14px 12px;border:0;border-bottom:1px solid var(--border,#273448);background:transparent;color:inherit;cursor:pointer}
.website-inbox-page .inbox-record:hover,.website-inbox-page .inbox-record.selected{background:rgba(65,125,255,.1)}
.website-inbox-page .inbox-unread-dot{width:8px;height:8px;flex:none;border-radius:50%;background:#60a5fa;margin-top:5px}
.website-inbox-page .inbox-unread-dot.read{background:transparent;border:1px solid #64748b}
.website-inbox-page .inbox-record-main{display:grid;gap:5px;min-width:0;width:100%}
.website-inbox-page .inbox-record-title{font-weight:700;overflow-wrap:anywhere}
.website-inbox-page .inbox-record-meta,.website-inbox-page .inbox-record-date{font-size:12px;color:var(--muted,#94a3b8)}
.website-inbox-page .inbox-record-preview{font-size:13px;color:var(--muted,#94a3b8);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.website-inbox-page .inbox-detail{padding:18px}
.website-inbox-page .inbox-detail-head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border,#273448);padding-bottom:14px}
.website-inbox-page .inbox-detail-head h3{margin:6px 0;overflow-wrap:anywhere}
.website-inbox-page .inbox-contact{display:grid;gap:5px;margin:16px 0;font-size:13px}
.website-inbox-page .inbox-contact a{color:var(--accent,#80aaff);overflow-wrap:anywhere}
.website-inbox-page .inbox-message{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}
.website-inbox-page .inbox-fields{font-size:13px;margin:16px 0}
.website-inbox-page .inbox-fields div{padding:7px 0;border-bottom:1px solid var(--border,#273448);overflow-wrap:anywhere}
.website-inbox-page .inbox-field{display:grid;gap:7px;font-size:13px;margin:14px 0}
.website-inbox-page .inbox-field textarea{resize:vertical;width:100%}
.website-inbox-page .inbox-empty{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted,#94a3b8);text-align:center}
.website-inbox-page .inbox-disclaimer{font-size:12px;color:var(--muted,#94a3b8);margin-top:14px}
@media(max-width:900px){.website-inbox-page .inbox-layout{grid-template-columns:1fr}.website-inbox-page .inbox-list{max-height:500px;overflow:auto}}
`}</style>
    <div className="section-heading"><div><p className="eyebrow">CENTRAL COMMUNICATIONS</p><h2>Website Inbox</h2><p className="welcome-subtitle">Applications, contact requests and feedback from connected PRUDEN websites.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
    <div className="metric-grid">
      <article className="metric-card"><div className="metric-top"><span>Total submissions</span><Inbox size={17}/></div><div className="metric-value">{records.length}</div><div className="metric-foot">Saved in Supabase</div></article>
      <article className="metric-card"><div className="metric-top"><span>Unread</span><AlertCircle size={17}/></div><div className="metric-value">{unread}</div><div className="metric-foot">Awaiting your review</div></article>
      <article className="metric-card"><div className="metric-top"><span>In review</span></div><div className="metric-value">{records.filter(item => item.status === "in_review").length}</div><div className="metric-foot">Being handled</div></article>
      <article className="metric-card"><div className="metric-top"><span>Resolved</span><CheckCircle2 size={17}/></div><div className="metric-value">{records.filter(item => item.status === "resolved").length}</div><div className="metric-foot">Closed records</div></article>
    </div>
    {error && <div role="alert" className="panel" style={{ margin: "16px 0", color: "#fca5a5" }}>{error}</div>}
    <div className="inbox-layout">
      <section className="panel inbox-list">
        <div className="inbox-toolbar"><strong>Incoming messages</strong><select aria-label="Filter inbox" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All items</option><option value="unread">Unread</option>{statuses.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
        {loading ? <p className="empty-nav">Loading inbox…</p> : visible.length === 0 ? <p className="empty-nav">No submissions here yet. Once a connected website posts to the inbox endpoint, records will appear here.</p> : visible.map(record => <button className={`inbox-record ${selected?.id === record.id ? "selected" : ""}`} key={record.id} onClick={() => void openRecord(record)}>
          <span className={`inbox-unread-dot ${record.is_read ? "read" : ""}`} />
          <span className="inbox-record-main"><span className="inbox-record-title">{record.subject || record.name || record.submission_type.replaceAll("_", " ")}</span><span className="inbox-record-meta">{record.source_site} · {record.submission_type.replaceAll("_", " ")}</span><span className="inbox-record-preview">{record.message || Object.entries(record.payload || {}).map(([key, value]) => key + ": " + String(value)).join(" · ") || "Form submission"}</span><span className="inbox-record-date">{date(record.created_at)}</span></span>
        </button>)}
      </section>
      <section className="panel inbox-detail">
        {!selected ? <div className="inbox-empty"><Inbox size={30}/><strong>Select a submission</strong><span>Review the details and update its handling status.</span></div> : <>
          <div className="inbox-detail-head"><div><p className="eyebrow">{selected.source_site}</p><h3>{selected.subject || selected.submission_type.replaceAll("_", " ")}</h3><small>{date(selected.created_at)}</small></div>{selected.source_url && <a href={selected.source_url} target="_blank" rel="noreferrer" aria-label="Open source website"><ExternalLink size={16}/></a>}</div>
          <div className="inbox-contact"><strong>{selected.name || "Name not provided"}</strong>{selected.email && <a href={`mailto:${selected.email}`}>{selected.email}</a>}{selected.phone && <a href={`tel:${selected.phone}`}>{selected.phone}</a>}</div>
          <p className="inbox-message">{selected.message || "No message text was provided."}</p>
          {Object.keys(selected.payload || {}).length > 0 && <details className="inbox-fields"><summary>Additional form fields</summary>{Object.entries(selected.payload).map(([key, value]) => <div key={key}><b>{key.replaceAll("_", " ")}:</b> {typeof value === "string" ? value : JSON.stringify(value)}</div>)}</details>}
          <label className="inbox-field">Status<select value={selected.status} onChange={event => setSelected({ ...selected, status: event.target.value })}>{statuses.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
          <label className="inbox-field">Priority<select value={selected.priority} onChange={event => setSelected({ ...selected, priority: event.target.value })}>{["low", "normal", "high", "urgent"].map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label className="inbox-field">Private handling notes<textarea rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Record follow-up actions or response notes…"/></label>
          <button className="primary-button" onClick={() => void saveRecord()} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </>}
      </section>
    </div>
    <p className="inbox-disclaimer">Email and WhatsApp notifications are shown as unconfigured until provider credentials are added and delivery is verified. Inbox storage does not depend on notification delivery.</p>
  </div>;
}
