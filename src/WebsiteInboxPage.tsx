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

  return <div className="website-inbox-page">
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
