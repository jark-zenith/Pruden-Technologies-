import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Clock3, Database, ExternalLink, Github, RefreshCw, Server, ShieldCheck } from "lucide-react";

type HealthResult = { ok?: boolean; service?: string; accessConfigured?: boolean };
type CheckState = { state: "checking" | "ok" | "error" | "unknown"; detail: string; checkedAt?: string };


export default function InfrastructurePage() {
  const [backend, setBackend] = useState<CheckState>({ state: "checking", detail: "Checking the current application backend…" });
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setBackend({ state: "checking", detail: "Requesting the private backend health endpoint…" });
    try {
      const response = await fetch("https://pruden-command-secure.onrender.com/health", { headers: { Accept: "application/json" }, cache: "no-store", mode: "cors" });
      if (!response.ok) throw new Error("Health endpoint returned HTTP " + response.status);
      const payload = await response.json() as HealthResult;
      if (payload.ok !== true) throw new Error("Health response did not confirm ok=true.");
      setBackend({ state: "ok", detail: payload.service ? "Service responded: " + payload.service : "Health endpoint returned ok=true.", checkedAt: new Date().toLocaleString() });
    } catch (error) {
      setBackend({ state: "error", detail: error instanceof Error ? error.message : "Health check failed.", checkedAt: new Date().toLocaleString() });
    } finally {
      const now = new Date().toLocaleString();
      setLastRefresh(now);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const statusLabel = (state: CheckState["state"]) => state === "ok" ? "Verified responding" : state === "error" ? "Check failed" : state === "checking" ? "Checking…" : "Not checked";

  return <section className="module-page">
    <div className="module-title-row"><div><p className="eyebrow">PTMS / SYSTEMS / DAY 1</p><h1>Infrastructure</h1><p className="welcome-subtitle">Live checks and verified connection inventory. The read-only backend health check is cross-origin; API execution remains separately authenticated.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={15} /> {refreshing ? "Checking…" : "Refresh checks"}</button></div>
    <div className="github-summary-grid">
      <article className="github-summary-card"><span>Backend health</span><strong>{statusLabel(backend.state)}</strong><small>{backend.checkedAt ? "Checked " + backend.checkedAt : "Initial check in progress"}</small></article>
      <article className="github-summary-card"><span>Render services</span><strong>2 inventoried</strong><small>Provider API verification still required</small></article>
      <article className="github-summary-card"><span>Database</span><strong>Auth query dependent</strong><small>Supabase client connection is tested by data modules</small></article>
    </div>
    <div className="github-project-detail-grid">
      <article className="github-project-detail-panel"><h2><Activity size={17} /> Service checks</h2>
        <div className="service-list">
          <div className="service-row"><span className="service-icon"><Server size={16} /></span><span><strong>PTMS API / health endpoint</strong><small>{backend.detail}</small></span><span className="service-state"><i /> {statusLabel(backend.state)}</span></div>
          <div className="service-row"><span className="service-icon"><Database size={16} /></span><span><strong>Supabase Auth + PostgreSQL</strong><small>Verified when signed-in project/task/approval queries succeed.</small></span><span className="service-state"><i /> Existing data modules</span></div>
          <div className="service-row"><span className="service-icon"><Github size={16} /></span><span><strong>GitHub source</strong><small>Repository: jark-zenith/Pruden-Technologies-</small></span><span className="service-state"><i /> Inventory link</span></div>
        </div>
      </article>
      <article className="github-project-detail-panel"><h2><ShieldCheck size={17} /> Deployment inventory</h2>
        <p><strong>Backend — pruden-command-secure</strong></p><p>Render service ID: <code>srv-db9t1v3bc2fs73d4hpqg</code></p><p><a href="https://dashboard.render.com/web/srv-db9t1v3bc2fs73d4hpqg" target="_blank" rel="noreferrer">Open backend in Render <ExternalLink size={12} /></a></p>
        <hr />
        <p><strong>Frontend — pruden-technologies</strong></p><p>Render service ID: <code>srv-db9pb0tg1s2s739i8rj0</code></p><p><a href="https://dashboard.render.com/static/srv-db9pb0tg1s2s739i8rj0" target="_blank" rel="noreferrer">Open frontend in Render <ExternalLink size={12} /></a></p>
      </article>
    </div>
    <article className="github-project-detail-panel"><h2><Clock3 size={17} /> Day 1 follow-ups</h2><ul><li>Configure Render health-check path to <code>/health</code> only after confirming the service settings and expected deploy impact.</li><li>Verify the deployed frontend can reach its intended backend and confirm API routing.</li><li>Review Supabase RLS, missing foreign-key indexes and auth-related policy warnings before applying migrations.</li><li>Resolve server-side session revocation design before treating logout as immediate revocation of a copied cookie.</li></ul><p className="welcome-subtitle">No production settings or database schema were changed by this page.</p></article>
    {lastRefresh && <p className="github-results-line">{backend.state === "error" ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />} Last health check attempt: {lastRefresh}. Status describes this browser's current origin only.</p>}
  </section>;
}
