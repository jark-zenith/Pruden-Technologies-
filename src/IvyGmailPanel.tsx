import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink, FileText, Inbox, LoaderCircle, Mail, Search, Send, ShieldCheck, Unplug } from "lucide-react";

type GmailMessage = { id: string; threadId?: string; from: string; to: string; subject: string; date: string; snippet: string; body?: string };
type GmailLabel = { id: string; name: string; type: string };
type GmailStatus = { oauthConfigured: boolean; tokenStoreConfigured: boolean; expectedEmail: string; connected: boolean; error?: string };
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid var(--line, #2c405b)", background: "var(--surface, #0d1625)", color: "var(--text, #edf4ff)", borderRadius: 10, padding: "10px 12px", font: "inherit" };
const actionStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "1px solid var(--line, #2c405b)", borderRadius: 10, padding: "9px 12px", background: "var(--surface, #0d1625)", color: "var(--text, #edf4ff)", cursor: "pointer", fontWeight: 700, fontSize: 12 };

export default function IvyGmailPanel() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("in:inbox newer_than:30d");
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selected, setSelected] = useState<GmailMessage | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ivy/gmail/status");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check Gmail status.");
      setStatus(data);
      setError(data.error || "");
      if (data.connected) {
        const labelResponse = await fetch("/api/ivy/gmail/labels");
        const labelData = await labelResponse.json();
        if (labelResponse.ok) setLabels(labelData.labels || []);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check Gmail status.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  async function requestJson(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed (" + response.status + ").");
    return data;
  }
  async function searchMessages(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true); setError(""); setNotice(""); setSelected(null);
    try {
      const data = await requestJson("/api/ivy/gmail/search?q=" + encodeURIComponent(query));
      setMessages(data.messages || []);
      setNotice((data.messages || []).length + " matching emails loaded.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Email search failed."); }
    finally { setBusy(false); }
  }
  async function readMessage(message: GmailMessage) {
    setBusy(true); setError("");
    try {
      const data = await requestJson("/api/ivy/gmail/messages/" + encodeURIComponent(message.id));
      setSelected(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open email."); }
    finally { setBusy(false); }
  }
  async function saveDraft(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setDraftId(""); setConfirmation("");
    try {
      const data = await requestJson("/api/ivy/gmail/drafts", { method: "POST", body: JSON.stringify({ to, subject, body }) });
      setDraftId(data.id);
      setNotice("Draft saved in Ivy's Gmail. It has not been sent.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the draft."); }
    finally { setBusy(false); }
  }
  async function sendDraft() {
    if (!draftId || confirmation !== "SEND EMAIL") return;
    const approved = window.confirm("Send this saved email from " + (status?.expectedEmail || "Ivy's Gmail") + " to " + to + "? This action cannot be undone.");
    if (!approved) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/ivy/gmail/send", { method: "POST", body: JSON.stringify({ draftId, explicitConfirmation: confirmation }) });
      setNotice("Gmail accepted the send request. Check Sent in Ivy's mailbox to verify delivery status.");
      setDraftId(""); setConfirmation(""); setShowComposer(false); setTo(""); setSubject(""); setBody("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send email."); }
    finally { setBusy(false); }
  }
  async function organizeMessage(action: string) {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/ivy/gmail/messages/" + encodeURIComponent(selected.id) + "/organize", {
        method: "POST", body: JSON.stringify({ action, ...(selectedLabel ? { labelId: selectedLabel } : {}) })
      });
      setNotice(action === "archive" ? "Email archived." : action === "mark_read" ? "Email marked as read." : action === "mark_unread" ? "Email marked unread." : action === "add_label" ? "Label applied." : "Label removed.");
      if (action === "archive") setMessages((current) => current.filter((item) => item.id !== selected.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not organize email."); }
    finally { setBusy(false); }
  }
  async function createLabel(event: FormEvent) {
    event.preventDefault();
    const name = newLabel.trim();
    if (!name) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await requestJson("/api/ivy/gmail/labels", { method: "POST", body: JSON.stringify({ name }) });
      setLabels((current) => [...current, data]);
      setSelectedLabel(data.id);
      setNewLabel("");
      setNotice("Gmail label created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create label."); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!window.confirm("Disconnect Ivy's Gmail integration? Saved encrypted OAuth tokens will be removed from PRUDEN's token table.")) return;
    setBusy(true); setError(""); setNotice("");
    try { await requestJson("/api/ivy/gmail/disconnect", { method: "POST", body: "{}" }); setMessages([]); setSelected(null); setStatus((current) => current ? { ...current, connected: false } : current); setNotice("Ivy's Gmail integration is disconnected."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Disconnect failed."); }
    finally { setBusy(false); }
  }

  const button = (label: string, onClick: () => void, disabled = false) => <button type="button" style={actionStyle} onClick={onClick} disabled={disabled}>{label}</button>;
  return <section className="panel ivy-gmail-panel" style={{ marginTop: 18, padding: 20, borderRadius: 18 }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center" }}><span className="ivy-avatar"><Mail size={18} /></span><div><p className="eyebrow" style={{ margin: "0 0 4px" }}>IVY / MAIL OPERATIONS</p><h3 style={{ margin: 0 }}>Ivy's Gmail workspace</h3><p style={{ margin: "5px 0 0", fontSize: 12, opacity: .75 }}>{status?.expectedEmail || "ivyassistantai@gmail.com"}</p></div></div>
      {button("Refresh status", () => void refreshStatus(), loading || busy)}
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 15, padding: 12, borderRadius: 12, background: "var(--surface-muted, #101e30)" }}>
      <ShieldCheck size={17} />
      <strong style={{ fontSize: 12 }}>{loading ? "Checking connection…" : status?.connected ? "Gmail connected" : "Gmail not connected"}</strong>
      <span style={{ fontSize: 12, opacity: .75 }}>{status?.connected ? "Ivy's mailbox only" : "Connect OAuth to enable mailbox operations."}</span>
      {!status?.connected && button(<><ExternalLink size={13} /> Connect Ivy's Gmail</> as unknown as string, () => { window.location.assign("/api/ivy/gmail/oauth/start"); }, loading || !status?.oauthConfigured || !status?.tokenStoreConfigured)}
      {status?.connected && button(<><Unplug size={13} /> Disconnect</> as unknown as string, () => void disconnect(), busy)}
    </div>
    {(!status?.oauthConfigured || !status?.tokenStoreConfigured) && <div style={{ marginTop: 12, padding: 12, border: "1px solid #8b6a2b", borderRadius: 11, fontSize: 12, lineHeight: 1.6 }}>
      <strong>Server setup required before connecting.</strong>
      <p style={{ margin: "6px 0" }}>Google OAuth: {status?.oauthConfigured ? "configured" : "missing client ID, client secret, or redirect URI"}. Secure token storage: {status?.tokenStoreConfigured ? "configured" : "missing Supabase service-role access or encryption key"}.</p>
      <p style={{ margin: 0 }}>Apply <code>supabase/migrations/202610210001_ivy_gmail_tokens.sql</code> and set the required private server environment variables. Do not place OAuth secrets in browser variables.</p>
    </div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      {button(<><Inbox size={14} /> Search mailbox</> as unknown as string, () => void searchMessages(), !status?.connected || busy)}
      {button(<><FileText size={14} /> Compose draft</> as unknown as string, () => { setShowComposer((value) => !value); setDraftId(""); setNotice(""); setError(""); }, !status?.connected || busy)}
    </div>
    {status?.connected && <form onSubmit={searchMessages} style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <input aria-label="Gmail search query" style={fieldStyle} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Gmail search, e.g. from:someone@example.com" />
      <button type="submit" style={actionStyle} disabled={busy || !query.trim()} aria-label="Search Gmail"><Search size={15} /></button>
    </form>}
    {showComposer && status?.connected && <form onSubmit={saveDraft} style={{ display: "grid", gap: 9, marginTop: 14, padding: 13, border: "1px solid var(--line, #2c405b)", borderRadius: 12 }}>
      <strong>Compose and save a draft</strong>
      <input style={fieldStyle} type="email" required value={to} onChange={(event) => setTo(event.target.value)} placeholder="Recipient email" aria-label="Recipient email" />
      <input style={fieldStyle} required maxLength={500} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" aria-label="Email subject" />
      <textarea style={{ ...fieldStyle, minHeight: 120, resize: "vertical" }} required maxLength={20000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Email body" aria-label="Email body" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={actionStyle} type="submit" disabled={busy}><FileText size={14} /> Save draft only</button><span style={{ fontSize: 11, opacity: .7, alignSelf: "center" }}>Saving a draft never sends it.</span></div>
      {draftId && <div style={{ display: "grid", gap: 8, paddingTop: 10, borderTop: "1px solid var(--line, #2c405b)" }}><strong>Draft saved — review before sending</strong><p style={{ margin: 0, fontSize: 12 }}>To: {to} · Subject: {subject}</p><label style={{ display: "grid", gap: 6, fontSize: 12 }}>Type <code>SEND EMAIL</code> to authorize sending this saved draft.<input style={fieldStyle} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="SEND EMAIL" /></label><button type="button" style={{ ...actionStyle, borderColor: "#b87542" }} disabled={busy || confirmation !== "SEND EMAIL"} onClick={() => void sendDraft()}><Send size={14} /> Send this email</button></div>}
    </form>}
    {messages.length > 0 && <div style={{ display: "grid", gap: 7, marginTop: 14 }}>
      <strong style={{ fontSize: 13 }}>Search results ({messages.length})</strong>
      {messages.map((message) => <button type="button" key={message.id} onClick={() => void readMessage(message)} style={{ ...actionStyle, textAlign: "left", display: "grid", justifyContent: "stretch", gap: 3, padding: 11 }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong style={{ overflowWrap: "anywhere" }}>{message.subject || "(No subject)"}</strong><small>{message.date}</small></span><span style={{ opacity: .8 }}>From: {message.from}</span><span style={{ opacity: .7, fontWeight: 400, whiteSpace: "normal" }}>{message.snippet}</span>
      </button>)}
    </div>}
    {selected && <article style={{ marginTop: 14, padding: 14, border: "1px solid var(--line, #2c405b)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><h4 style={{ margin: "0 0 10px" }}>{selected.subject || "(No subject)"}</h4><button type="button" style={actionStyle} onClick={() => setSelected(null)}>Close</button></div>
      <p style={{ fontSize: 12, opacity: .8, overflowWrap: "anywhere" }}>From: {selected.from}<br />To: {selected.to}<br />Date: {selected.date}</p>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "10px 0" }}>
        <button type="button" style={actionStyle} disabled={busy} onClick={() => void organizeMessage("archive")}>Archive</button>
        <button type="button" style={actionStyle} disabled={busy} onClick={() => void organizeMessage("mark_read")}>Mark read</button>
        <button type="button" style={actionStyle} disabled={busy} onClick={() => void organizeMessage("mark_unread")}>Mark unread</button>
        <select aria-label="Gmail label" style={{ ...fieldStyle, width: "auto", maxWidth: 200 }} value={selectedLabel} onChange={(event) => setSelectedLabel(event.target.value)}><option value="">Choose label</option>{labels.filter((label) => label.type === "user").map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}</select>
        <button type="button" style={actionStyle} disabled={busy || !selectedLabel} onClick={() => void organizeMessage("add_label")}>Apply label</button>
        <button type="button" style={actionStyle} disabled={busy || !selectedLabel} onClick={() => void organizeMessage("remove_label")}>Remove label</button>
      </div>
      <form onSubmit={createLabel} style={{ display: "flex", gap: 7, margin: "8px 0 12px" }}><input aria-label="New Gmail label" style={fieldStyle} value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Create a label" maxLength={225} /><button type="submit" style={actionStyle} disabled={busy || !newLabel.trim()}>Create label</button></form>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", font: "inherit", fontSize: 13, lineHeight: 1.6, maxHeight: 420, overflow: "auto" }}>{selected.body || selected.snippet || "(No plain-text body was available.)"}</pre>
    </article>}
    {busy && <p style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12 }}><LoaderCircle size={14} /> Working with Gmail…</p>}
    {error && <p role="alert" style={{ color: "#ff9999", fontSize: 12 }}>{error}</p>}
    {notice && <p role="status" style={{ color: "#72d8ac", fontSize: 12, display: "flex", gap: 7, alignItems: "center" }}><CheckCircle2 size={14} />{notice}</p>}
    <p style={{ margin: "14px 0 0", paddingTop: 12, borderTop: "1px solid var(--line, #2c405b)", fontSize: 11, opacity: .75, lineHeight: 1.6 }}>Safety rule: Ivy can read, search and draft only in her own mailbox. Sending requires you to save a draft, type the exact confirmation phrase, and approve the browser confirmation. OAuth tokens are encrypted before server-side storage.</p>
  </section>;
}
