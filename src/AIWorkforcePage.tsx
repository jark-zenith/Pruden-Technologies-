import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, CheckCircle2, CircleAlert, LoaderCircle, Play, ShieldCheck, Sparkles } from "lucide-react";

type Agent = {
  id: string; name: string; title: string; reportsTo?: string; responsibilities?: string[];
  allowedActions?: string[]; restrictedActions?: string[]; department?: string;
};
type Department = { id: string; name: string; lead: string; independent?: boolean; agents: Agent[] };
type Registry = { ivy: Agent; departments: Department[]; controls?: { autonomy?: string; toolsEnabled?: boolean; externalActionsEnabled?: boolean } };
type WorkforceStatus = { configured: boolean; provider: string; model: string; agentCount: number; toolsEnabled: boolean; externalActionsEnabled: boolean };

export default function AIWorkforcePage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [status, setStatus] = useState<WorkforceStatus | null>(null);
  const [selected, setSelected] = useState("ivy");
  const [task, setTask] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastAgent, setLastAgent] = useState<Agent | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/workforce/agents").then(async (r) => { if (!r.ok) throw new Error("Could not load the agent registry."); return r.json() as Promise<Registry>; }),
      fetch("/api/workforce/status").then(async (r) => { if (!r.ok) throw new Error("Could not check Claude status."); return r.json() as Promise<WorkforceStatus>; })
    ]).then(([nextRegistry, nextStatus]) => {
      if (!alive) return;
      setRegistry(nextRegistry); setStatus(nextStatus); setError("");
    }).catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : "Workforce API unavailable."); })
      .finally(() => { if (alive) setLoadingRegistry(false); });
    return () => { alive = false; };
  }, []);

  const agents = useMemo(() => registry ? [
    { ...registry.ivy, department: "Executive Office" },
    ...registry.departments.flatMap((department) => department.agents.map((agent) => ({ ...agent, department: department.name })))
  ] : [], [registry]);
  const selectedAgent = agents.find((agent) => agent.id === selected) || agents[0];

  async function runAgent() {
    if (!selectedAgent || !task.trim() || running) return;
    setRunning(true); setError(""); setOutput(""); setLastAgent(selectedAgent);
    try {
      const response = await fetch("/api/workforce/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent.id, task: task.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Agent request failed.");
      setOutput(String(data.output || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Agent request failed.");
    } finally { setRunning(false); }
  }

  return <section className="module-page workforce-page">
    <div className="module-title-row">
      <div><p className="eyebrow">INTELLIGENCE / WORKFORCE</p><h1>AI Workforce</h1><p className="welcome-subtitle">Your AI departments, under Founder authority.</p></div>
      <span className={status?.configured ? "workforce-status online" : "workforce-status offline"}><span />{status?.configured ? "Claude configured" : "Claude not configured"}</span>
    </div>
    <div className="workforce-notice"><ShieldCheck size={17} /><div><strong>Bounded autonomy is active</strong><p>Agents can reason and draft. This runtime does not send messages, browse live websites, change repositories, access customer records, spend money, or deploy software.</p></div></div>
    <div className="workforce-metrics">
      <article className="metric-card"><div className="metric-top"><span>AI identities</span><span className="metric-icon violet"><Bot size={17} /></span></div><div className="metric-value">{status?.agentCount ?? (registry ? agents.length : "—")} <small>registered</small></div></article>
      <article className="metric-card"><div className="metric-top"><span>Departments</span><span className="metric-icon blue"><Activity size={17} /></span></div><div className="metric-value">{registry?.departments.length ?? "—"} <small>operational groups</small></div></article>
      <article className="metric-card"><div className="metric-top"><span>External actions</span><span className="metric-icon amber"><ShieldCheck size={17} /></span></div><div className="metric-value">Disabled <small>by policy</small></div></article>
    </div>
    {error && <div className="workforce-error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
    {loadingRegistry ? <div className="panel workforce-loading"><LoaderCircle size={18} /> Loading AI workforce registry…</div> : registry ? <>
      <div className="workforce-layout">
        <div className="panel workforce-roster">
          <div className="workforce-panel-heading"><div><p className="eyebrow">REPORTING STRUCTURE</p><h2>Departments & agents</h2></div><span className="neutral-tag">{agents.length} identities</span></div>
          <button className={selected === "ivy" ? "workforce-agent selected" : "workforce-agent"} onClick={() => setSelected("ivy")}>
            <span className="workforce-avatar ivy">I</span><span className="workforce-agent-copy"><strong>Ivy</strong><small>AI Chief of Staff · Reports to Founder</small></span><span className="workforce-role-tag">EXECUTIVE</span>
          </button>
          {registry.departments.map((department) => <div className="workforce-department" key={department.id}>
            <div className="workforce-department-heading"><div><strong>{department.name}</strong><small>{department.agents.length} specialist{department.agents.length === 1 ? "" : "s"}{department.independent ? " · Independent QA" : ""}</small></div><span>LEAD: {department.lead}</span></div>
            {department.agents.map((agent) => <button key={agent.id} className={selected === agent.id ? "workforce-agent selected" : "workforce-agent"} onClick={() => setSelected(agent.id)}>
              <span className="workforce-avatar">{agent.name.slice(0, 1)}</span><span className="workforce-agent-copy"><strong>{agent.name}</strong><small>{agent.title}</small></span><span className="workforce-chevron">›</span>
            </button>)}
          </div>)}
        </div>
        <div className="workforce-main-column">
          <div className="panel workforce-profile">
            <div className="workforce-panel-heading"><div><p className="eyebrow">AGENT PROFILE</p><h2>{selectedAgent?.name || "Select an agent"}</h2></div><span className="workforce-live-pill"><span /> READY</span></div>
            <p className="workforce-role-title">{selectedAgent?.title}</p>
            <p className="workforce-reporting">Reports to <strong>{selectedAgent?.reportsTo || "Founder"}</strong>{selectedAgent?.department ? " · " + selectedAgent.department : ""}</p>
            <h3>Responsibilities</h3><ul>{(selectedAgent?.responsibilities || []).map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="workforce-permissions"><div><strong>Allowed task types</strong><p>{(selectedAgent?.allowedActions || []).join(" · ") || "Coordination and reporting"}</p></div><div><strong>Restricted actions</strong><p>{(selectedAgent?.restrictedActions || []).join(" · ") || "No self-granted permissions"}</p></div></div>
          </div>
          <div className="panel workforce-runner">
            <div className="workforce-panel-heading"><div><p className="eyebrow">TASK CONSOLE</p><h2>Give this agent a task</h2></div><Sparkles size={18} /></div>
            <p className="workforce-help">Use clear goals and include the relevant notes. The agent returns a draft or analysis; it cannot take external action.</p>
            <label className="field-label" htmlFor="workforce-task">Task instructions</label>
            <textarea id="workforce-task" className="workforce-task-input" value={task} onChange={(event) => setTask(event.target.value)} maxLength={12000} placeholder={"Example: Ivy, prepare today's priorities from these notes…"} rows={5} />
            <button className="primary-button workforce-run-button" onClick={runAgent} disabled={!task.trim() || running || !selectedAgent || !status?.configured}>{running ? <><LoaderCircle size={15} className="workforce-spinner" /> Working…</> : <><Play size={15} /> Run {selectedAgent?.name || "agent"}</>}</button>
            {!status?.configured && <p className="workforce-help">Add the existing Claude API key to the server's private environment as ANTHROPIC_API_KEY. Do not paste it here or put it in frontend code.</p>}
            {output && <div className="workforce-output"><div className="workforce-output-heading"><CheckCircle2 size={16} /><strong>{lastAgent?.name || "Agent"} returned a result</strong></div><pre>{output}</pre></div>}
          </div>
        </div>
      </div>
      <div className="workforce-footnote">Model: {status?.model || "configured by server"} · Shared server-side key · No browser secrets · Founder approval remains mandatory for consequential actions.</div>
    </> : <div className="panel workforce-loading">The workforce registry could not be loaded.</div>}
  </section>;
}
