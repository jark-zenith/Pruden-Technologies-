import { Activity, ArrowDownToLine, Bot, CheckCircle2, CircleDashed, GitBranch, LockKeyhole, Server, ShieldCheck, Database, AlertTriangle } from "lucide-react";

type Source = { name: string; detail: string; icon: typeof GitBranch; status: string; note: string };

const sources: Source[] = [
  { name: "GitHub", detail: "Repositories, commits, pull requests, issues", icon: GitBranch, status: "Existing PTMS integration", note: "Ivy's GitHub tools are allowlist-gated. Confirm repository access in the private server configuration." },
  { name: "Render", detail: "Services, deployment metadata, service status", icon: Server, status: "Configuration required", note: "The existing runtime integration requires RENDER_API_KEY; source code alone does not prove a live connection." },
  { name: "Supabase", detail: "Approved project metadata and application data", icon: Database, status: "Adapter not implemented", note: "Each Supabase project needs an explicit data contract and least-privilege access policy. No cross-project database access is enabled by this page." },
];

const permissions = [
  { agent: "Ivy", scope: "Bridge administration and approved-source reads", level: "Privileged operator" },
  { agent: "Sentinel", scope: "Read-only security review and policy checks", level: "Independent reviewer" },
  { agent: "Atlas, Nova, and specialist agents", scope: "Assigned sources and task-specific read tools", level: "Restricted" },
];

export default function ProjectIntelligencePage() {
  return <section className="module-page">
    <div className="module-title-row">
      <div><p className="eyebrow">INTELLIGENCE / CROSS-PROJECT</p><h1>Project Intelligence Bridge</h1><p className="welcome-subtitle">A governed source of truth for the Pruden Technologies project ecosystem.</p></div>
      <span className="status-chip"><CircleDashed size={13} /> Foundation phase</span>
    </div>
    <div className="workforce-notice"><ShieldCheck size={17} /><div><strong>Read-only by default</strong><p>The bridge is not yet connected to a shared API. This control panel records the planned source and authority model; it does not claim that source connections are live.</p></div></div>
    <div className="module-cards">
      <article className="panel module-placeholder"><span className="large-module-icon"><Activity size={23} /></span><p className="eyebrow">BRIDGE SERVICE</p><h2>Separate repository</h2><p>The adapter service will normalize source data and expose authenticated, read-only endpoints to PTMS. Credentials remain server-side.</p><div className="placeholder-status"><CircleDashed size={14} /> Repository and API not connected</div></article>
      <article className="panel module-checklist"><p className="eyebrow">SECURITY BOUNDARY</p><h2>Authority controls</h2><div className="checklist-row"><span><LockKeyhole size={15} /></span><div><strong>Source allowlists</strong><p>Only explicitly approved repositories, Render services, and Supabase projects can be queried.</p></div></div><div className="checklist-row"><span><ShieldCheck size={15} /></span><div><strong>Approval before writes</strong><p>Future actions require a separate permission, a recorded approval, and an auditable execution result.</p></div></div><div className="checklist-row"><span><AlertTriangle size={15} /></span><div><strong>No secret exposure</strong><p>Agents receive scoped tool results, never raw API keys or service-role credentials.</p></div></div></article>
    </div>
    <div className="panel module-panel">
      <SectionHeadingPlaceholder title="Initial data sources" subtitle="Integration status must be verified from the running service before being marked connected." />
      {sources.map((source) => { const Icon = source.icon; return <div className="module-record" key={source.name}><span className="project-symbol blue"><Icon size={17} /></span><div className="record-main"><strong>{source.name}</strong><p>{source.detail}</p><small>{source.note}</small></div><span className="status-pill">{source.status}</span></div>; })}
    </div>
    <div className="panel module-panel">
      <SectionHeadingPlaceholder title="Workforce access matrix" subtitle="Initial proposed policy; enforce this server-side before enabling bridge tools." />
      {permissions.map((item) => <div className="module-record" key={item.agent}><span className="approval-symbol"><Bot size={16} /></span><div className="record-main"><strong>{item.agent}</strong><p>{item.scope}</p></div><span className="status-pill">{item.level}</span></div>)}
    </div>
    <div className="panel module-panel"><SectionHeadingPlaceholder title="Implementation sequence" subtitle="No source writes are enabled in this phase." /><div className="checklist-row"><span>01</span><div><strong>Provision the Bridge repository</strong><p>Build and test the source adapters, API contract, authentication, rate limits, and audit events.</p></div></div><div className="checklist-row"><span>02</span><div><strong>Connect PTMS to the Bridge</strong><p>Add server-to-server authentication, capability checks, and a verified connection status.</p></div></div><div className="checklist-row"><span>03</span><div><strong>Enable governed workforce tools</strong><p>Give Ivy administrative read tools; expose narrow read-only tools to other agents by policy.</p></div></div><div className="checklist-row"><span>04</span><div><strong>Design approved actions separately</strong><p>Use approval records, idempotency keys, action allowlists, and execution receipts before any write feature is enabled.</p></div></div></div>
    <footer className="footer-note"><span>PRUDEN COMMAND · PROJECT INTELLIGENCE</span><span><ArrowDownToLine size={13} /> Read-only foundation</span></footer>
  </section>;
}

function SectionHeadingPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="section-heading"><div><p className="eyebrow">BRIDGE CONTROL</p><h2>{title}</h2><p className="welcome-subtitle">{subtitle}</p></div></div>;
}
