import { useEffect, useState } from "react";
import { Activity, ArrowDownToLine, Bot, CircleDashed, GitBranch, LockKeyhole, Server, ShieldCheck, Database, AlertTriangle } from "lucide-react";

const sourceDefinitions = [
  { id: "github", name: "GitHub", detail: "Repositories, commits, pull requests, issues", icon: GitBranch },
  { id: "render", name: "Render", detail: "Services, deployment metadata, service status", icon: Server },
  { id: "supabase", name: "Supabase", detail: "Approved project metadata and application data", icon: Database },
] as const;

type BridgeStatus = { sources: Array<{ id: string; name: string; status: string; configured: boolean; verified: boolean; note: string }>; policy: { defaultAuthority: string; writesEnabled: boolean } };

const permissions = [
  { agent: "Ivy", scope: "Bridge administration and approved-source reads", level: "Privileged operator" },
  { agent: "Sentinel", scope: "Read-only security review and policy checks", level: "Independent reviewer" },
  { agent: "Atlas, Nova, and specialist agents", scope: "Assigned sources and task-specific read tools", level: "Restricted" },
];

export default function ProjectIntelligencePage() {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/project-intelligence/status", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Bridge status endpoint is unavailable.");
        return response.json() as Promise<BridgeStatus>;
      })
      .then((data) => { if (active) { setBridgeStatus(data); setStatusError(""); } })
      .catch((error) => { if (active) setStatusError(error instanceof Error ? error.message : "Unable to load Bridge status."); });
    return () => { active = false; };
  }, []);
  return <section className="module-page">
    <div className="module-title-row">
      <div><p className="eyebrow">INTELLIGENCE / CROSS-PROJECT</p><h1>Project Intelligence Bridge</h1><p className="welcome-subtitle">A governed source of truth for the Pruden Technologies project ecosystem.</p></div>
      <span className="status-chip"><CircleDashed size={13} /> {bridgeStatus ? "Status loaded" : "Foundation phase"}</span>
    </div>
    <div className="workforce-notice"><ShieldCheck size={17} /><div><strong>Read-only by default</strong><p>The in-PTMS status endpoint reports configuration separately from verified connectivity. A configured credential is not proof that a provider connection works.</p></div></div>
    <div className="module-cards">
      <article className="panel module-placeholder"><span className="large-module-icon"><Activity size={23} /></span><p className="eyebrow">BRIDGE SERVICE</p><h2>In-repository module</h2><p>The Bridge backend will run inside the existing PTMS server. It will normalize approved source data behind authenticated, read-only endpoints. Credentials remain server-side.</p><div className="placeholder-status"><CircleDashed size={14} /> {bridgeStatus ? (bridgeStatus.policy.writesEnabled ? "Write policy enabled" : "Read-only policy active") : statusError || "Loading Bridge status…"}</div></article>
      <article className="panel module-checklist"><p className="eyebrow">SECURITY BOUNDARY</p><h2>Authority controls</h2><div className="checklist-row"><span><LockKeyhole size={15} /></span><div><strong>Source allowlists</strong><p>Only explicitly approved repositories, Render services, and Supabase projects can be queried.</p></div></div><div className="checklist-row"><span><ShieldCheck size={15} /></span><div><strong>Approval before writes</strong><p>Future actions require a separate permission, a recorded approval, and an auditable execution result.</p></div></div><div className="checklist-row"><span><AlertTriangle size={15} /></span><div><strong>No secret exposure</strong><p>Agents receive scoped tool results, never raw API keys or service-role credentials.</p></div></div></article>
    </div>
    <div className="panel module-panel">
      <SectionHeadingPlaceholder title="Initial data sources" subtitle="Integration status must be verified from the running service before being marked connected." />
      {sourceDefinitions.map((source) => { const Icon = source.icon; const state = bridgeStatus?.sources.find((item) => item.id === source.id); return <div className="module-record" key={source.id}><span className="project-symbol blue"><Icon size={17} /></span><div className="record-main"><strong>{source.name}</strong><p>{source.detail}</p><small>{state?.note || (statusError ? "Live configuration status could not be loaded." : "Checking server-side configuration…")}</small></div><span className="status-pill">{state ? (state.verified ? "Verified" : state.status.replaceAll("_", " ")) : "Checking"}</span></div>; })}
    </div>
    <div className="panel module-panel">
      <SectionHeadingPlaceholder title="Workforce access matrix" subtitle="Initial proposed policy; enforce this server-side before enabling bridge tools." />
      {permissions.map((item) => <div className="module-record" key={item.agent}><span className="approval-symbol"><Bot size={16} /></span><div className="record-main"><strong>{item.agent}</strong><p>{item.scope}</p></div><span className="status-pill">{item.level}</span></div>)}
    </div>
    <div className="panel module-panel"><SectionHeadingPlaceholder title="Implementation sequence" subtitle="No source writes are enabled in this phase." /><div className="checklist-row"><span>01</span><div><strong>Implement source adapters inside PTMS</strong><p>Build and test GitHub, Render, and registered Supabase read adapters in the existing server process.</p></div></div><div className="checklist-row"><span>02</span><div><strong>Connect the control panel to the in-PTMS API</strong><p>Use the existing authenticated PTMS server boundary, capability checks, and verified connection status.</p></div></div><div className="checklist-row"><span>03</span><div><strong>Enable governed workforce tools</strong><p>Give Ivy administrative read tools; expose narrow read-only tools to other agents by policy.</p></div></div><div className="checklist-row"><span>04</span><div><strong>Design approved actions separately</strong><p>Use approval records, idempotency keys, action allowlists, and execution receipts before any write feature is enabled.</p></div></div></div>
    <footer className="footer-note"><span>PRUDEN COMMAND · PROJECT INTELLIGENCE</span><span><ArrowDownToLine size={13} /> Read-only foundation</span></footer>
  </section>;
}

function SectionHeadingPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="section-heading"><div><p className="eyebrow">BRIDGE CONTROL</p><h2>{title}</h2><p className="welcome-subtitle">{subtitle}</p></div></div>;
}
