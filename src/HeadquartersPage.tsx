import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Activity, CheckCircle2, ChevronRight, CircleDot, Clock3, Command, Cpu, FileText, Layers3, LoaderCircle, MessageSquareText, Printer, Search, Send, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import "./headquarters.css";

type Task = { id: string; title: string; project: string; priority: string; owner: string; state: string };
type Agent = { id: string; name: string; title: string; reportsTo?: string; responsibilities?: string[]; allowedActions?: string[]; restrictedActions?: string[]; department?: string; presentationGender?: string; personality?: string; orbColor?: string };
type Department = { id: string; name: string; lead: string; independent?: boolean; agents: Agent[] };
type Registry = { ivy: Agent; departments: Department[] };
type RunResult = { agent: Agent; output: string; state: "success" | "error" };

const rooms = [
  { id: "executive", name: "Executive command", short: "COMMAND", icon: Command, department: "Executive Office", description: "Ivy's coordination desk and founder command channel.", kind: "command" },
  { id: "growth", name: "Growth intelligence", short: "RESEARCH", icon: Search, department: "Growth & Intelligence", description: "Opportunity research, market intelligence and evidence briefs.", kind: "research" },
  { id: "client", name: "Client relations", short: "CLIENTS", icon: Users, department: "Client Relations & Business Development", description: "Requirements, lead qualification and approved outreach drafts.", kind: "client" },
  { id: "engineering", name: "Engineering lab", short: "ENGINEERING", icon: Cpu, department: "Engineering & AI Systems", description: "Software planning, interfaces, APIs and AI workflow design.", kind: "engineering" },
  { id: "quality", name: "Quality & security", short: "QA / SECURITY", icon: ShieldCheck, department: "Quality Assurance & Security", description: "Independent test planning, risk review and verification.", kind: "quality" },
  { id: "studios", name: "Pruden studios", short: "CREATIVE", icon: Sparkles, department: "Pruden Studios", description: "Brand design, creative direction and media production.", kind: "studio" },
  { id: "operations", name: "Operations hub", short: "OPERATIONS", icon: Layers3, department: "Operations & Delivery", description: "Project coordination, knowledge and operational handoffs.", kind: "operations" },
  { id: "server", name: "Infrastructure room", short: "SYSTEMS", icon: Cpu, department: "Infrastructure", description: "A visual systems area. No server telemetry is connected yet.", kind: "server" },
  { id: "print", name: "Print & production", short: "PRODUCTION", icon: Printer, department: "Production", description: "Reserved for real production and document workflows when connected.", kind: "print" },
  { id: "lounge", name: "Standby lounge", short: "STANDBY", icon: Clock3, department: "Standby", description: "Reserved recovery area. Agents without an active task remain in their registered department and are marked standby.", kind: "lounge" },
];

const agentRoom: Record<string, string> = {
  ivy: "executive", atlas: "growth", nova: "growth", echo: "client", mira: "client",
  forge: "engineering", pixel: "engineering", stack: "engineering", vector: "engineering",
  sentinel: "quality", lumi: "studios", motion: "studios", relay: "operations", vault: "operations",
};
const initials = (name: string) => name.slice(0, 1).toUpperCase();
const normalize = (value: string) => value.trim().toLowerCase();

function AgentAvatar({ agent, size = "normal", active = false, state = "standby" }: { agent: Agent; size?: "small" | "normal" | "large"; active?: boolean; state?: string }) {
  return <span className={`hq-avatar ${size} ${active ? "is-active" : ""}`} style={{ "--agent-color": agent.orbColor || "#5b9cff" } as CSSProperties} aria-label={agent.name} data-state={state}>
    <span className="hq-avatar-core">{initials(agent.name)}</span><i />
  </span>;
}

export default function HeadquartersPage({ tasks }: { tasks: Task[] }) {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [registryError, setRegistryError] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("ivy");
  const [selectedRoomId, setSelectedRoomId] = useState("executive");
  const [command, setCommand] = useState("");
  const [runningAgentId, setRunningAgentId] = useState("");
  const [runningTaskTitle, setRunningTaskTitle] = useState("");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [filter, setFilter] = useState("");
  const [showAllAgents, setShowAllAgents] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/workforce/agents", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("The workforce registry is unavailable."); return response.json() as Promise<Registry>; })
      .then((data) => { if (alive) { setRegistry(data); setRegistryError(""); } })
      .catch((error: unknown) => { if (alive) setRegistryError(error instanceof Error ? error.message : "Could not load registered agents."); });
    return () => { alive = false; };
  }, []);

  const agents = useMemo(() => registry ? [
    { ...registry.ivy, department: "Executive Office" },
    ...registry.departments.flatMap((department) => department.agents.map((agent) => ({ ...agent, department: department.name }))),
  ] : [], [registry]);

  const taskFor = (agent: Agent) => tasks.find((task) => normalize(task.owner) === normalize(agent.name) && ["In progress", "Planned", "Blocked"].includes(task.state));
  const agentTasks = (agent: Agent) => tasks.filter((task) => normalize(task.owner) === normalize(agent.name));
  const stateFor = (agent: Agent) => runningAgentId === agent.id ? "working" : taskFor(agent)?.state === "In progress" ? "working" : taskFor(agent)?.state === "Planned" ? "queued" : taskFor(agent)?.state === "Blocked" ? "blocked" : "standby";
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || agents[0];
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  const roomForAgent = (agent: Agent) => {
    const savedTask = taskFor(agent);
    const activeTaskTitle = runningAgentId === agent.id ? runningTaskTitle : savedTask?.state === "In progress" ? savedTask.title : "";
    if (/\b(print|printing|printer)\b/i.test(activeTaskTitle)) return "print";
    if (/\b(server|infrastructure|backup|deployment|deploy|logs|monitoring)\\b/i.test(activeTaskTitle)) return "server";
    return agentRoom[agent.id] || "lounge";
  };
  const roomAgents = (roomId: string) => agents.filter((agent) => roomForAgent(agent) === roomId);
  const registeredOwners = new Set(agents.map((agent) => normalize(agent.name)));
  const activeTaskCount = tasks.filter((task) => registeredOwners.has(normalize(task.owner)) && task.state === "In progress").length;
  const queuedTaskCount = tasks.filter((task) => registeredOwners.has(normalize(task.owner)) && task.state === "Planned").length;
  const filteredAgents = agents.filter((agent) => (agent.name + " " + agent.title + " " + agent.department).toLowerCase().includes(filter.toLowerCase()));

  function selectAgent(agent: Agent) {
    setSelectedAgentId(agent.id);
    setSelectedRoomId(roomForAgent(agent));
    setRunResult(null);
  }

  async function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent || !command.trim() || runningAgentId) return;
    const task = command.trim();
    setRunningAgentId(selectedAgent.id);
    setRunningTaskTitle(task);
    if (/\b(print|printing|printer)\b/i.test(task)) setSelectedRoomId("print");
    else if (/\b(server|infrastructure|backup|deployment|deploy|logs|monitoring)\b/i.test(task)) setSelectedRoomId("server");
    else setSelectedRoomId(agentRoom[selectedAgent.id] || "lounge");
    setRunResult(null);
    try {
      const response = await fetch("/api/workforce/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent.id, task }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The agent run did not complete.");
      setRunResult({ agent: selectedAgent, output: String(data.output || "The agent returned no text output."), state: "success" });
    } catch (error) {
      setRunResult({ agent: selectedAgent, output: error instanceof Error ? error.message : "Agent request failed.", state: "error" });
    } finally {
      setRunningAgentId("");
      setRunningTaskTitle("");
    }
  }

  return <section className="hq-page">
    <header className="hq-heading">
      <div><p className="eyebrow"><span className="hq-live-pulse" /> PRUDEN TECHNOLOGIES / DIGITAL WORKFORCE</p><h1>AI Headquarters<span>.</span></h1><p>One command floor. Fourteen registered AI identities. Your view into the work.</p></div>
      <div className="hq-heading-mark"><span>PT</span><small>HQ / 01</small></div>
    </header>

    <div className="hq-truth-strip"><span><CircleDot size={13} /> DEVELOPMENT VIEW</span><p>Agent presence comes from the workforce registry. Task states come from saved PTMS records. Active print/server task titles route the avatar to a matching virtual room; this is not physical telemetry.</p><span className="hq-truth-count"><ShieldCheck size={13} /> Evidence-led status</span></div>

    <div className="hq-metrics">
      <article><span>REGISTERED AGENTS</span><strong>{registry ? agents.length.toString().padStart(2, "0") : "—"}</strong><small>Authoritative workforce roster</small></article>
      <article><span>EXECUTING TASKS</span><strong>{activeTaskCount.toString().padStart(2, "0")}</strong><small>Saved status: In progress</small></article>
      <article><span>QUEUED TASKS</span><strong>{queuedTaskCount.toString().padStart(2, "0")}</strong><small>Saved status: Planned</small></article>
      <article><span>UNASSIGNED TASKS</span><strong>{tasks.filter((task) => !agents.some((agent) => normalize(agent.name) === normalize(task.owner)) && !["Completed", "Cancelled"].includes(task.state)).length.toString().padStart(2, "0")}</strong><small>Needs an owner or routing</small></article>
    </div>

    <div className="hq-workspace">
      <div className="hq-floor-column">
        <div className="hq-section-bar"><div><span className="hq-kicker">REGISTERED FLOOR PLAN</span><h2>Headquarters overview</h2></div><span className="hq-floor-key"><i className="queued" /> Queued <i className="working" /> In progress <i className="standby" /> Standby</span></div>
        <div className="hq-floorplan">
          <div className="hq-floor-topline"><span>PRUDEN / OPERATIONS CAMPUS</span><span>FLOOR 01 · VIRTUAL OFFICE</span></div>
          <div className="hq-room-grid">
            {rooms.map((room) => {
              const Icon = room.icon;
              const members = roomAgents(room.id);
              const isSelected = selectedRoomId === room.id;
              return <button key={room.id} className={`hq-room hq-room-${room.kind} ${isSelected ? "selected" : ""}`} onClick={() => { setSelectedRoomId(room.id); const first = members[0]; if (first) setSelectedAgentId(first.id); }}>
                <span className="hq-room-head"><span className="hq-room-icon"><Icon size={14} /></span><span><small>{room.short}</small><strong>{room.name}</strong></span><b>{members.length.toString().padStart(2, "0")}</b></span>
                <span className="hq-room-scene">
                  {room.kind === "server" ? <span className="hq-rack-row"><i /><i /><i /><i /></span> : room.kind === "print" ? <span className="hq-printer-scene"><i /><i /><i /></span> : <span className="hq-desks"><i /><i /><i /></span>}
                  <span className="hq-room-agents">{members.map((agent) => {
                    const task = taskFor(agent);
                    const status = stateFor(agent);
                    return <span key={agent.id} className={`hq-room-agent ${status} ${selectedAgentId === agent.id ? "chosen" : ""}`} onClick={(event) => { event.stopPropagation(); selectAgent(agent); }} title={agent.name + " · " + (task?.title || "No active PTMS task")}>
                      <AgentAvatar agent={agent} size="small" active={status === "working"} state={status} /><small>{agent.name}</small>
                    </span>;
                  })}</span>
                </span>
                <span className="hq-room-foot"><span>{room.description}</span><ChevronRight size={13} /></span>
              </button>;
            })}
          </div>
          <div className="hq-floor-bottom"><span><i /> FLOOR VIEW READY</span><span>ROOM PLACEMENT = DEPARTMENT OR TASK ROUTE</span></div>
        </div>
        <div className="hq-lower-grid">
          <section className="hq-panel hq-command-panel">
            <div className="hq-panel-heading"><div><span className="hq-kicker">COMMAND CHANNEL</span><h3>Send a task</h3></div><span className="hq-ivy-label"><AgentAvatar agent={agents.find((agent) => agent.id === "ivy") || { id: "ivy", name: "Ivy", title: "AI Chief of Staff", orbColor: "#53b9ff" }} size="small" /> SELECTED AGENT / DIRECT RUN</span></div>
            <p>Choose an agent on the floor, then send a task through the existing PTMS workforce endpoint. Selecting Ivy requests her coordination response; automatic multi-agent dispatch is not implemented yet.</p>
            <form className="hq-command-form" onSubmit={runCommand}>
              <label htmlFor="hq-command-input">ASSIGNED TO <strong>{selectedAgent?.name || "Loading roster"}</strong></label>
              <div><input id="hq-command-input" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Describe the task and expected output…" maxLength={10000} disabled={!selectedAgent || Boolean(runningAgentId)} /><button type="submit" disabled={!selectedAgent || !command.trim() || Boolean(runningAgentId)}>{runningAgentId ? <LoaderCircle size={15} className="hq-spin" /> : <Send size={15} />}<span>Run task</span></button></div>
            </form>
            {runResult && <div className={`hq-run-result ${runResult.state}`}><div><strong>{runResult.state === "success" ? runResult.agent.name + " returned a response" : "Run failed"}</strong><button onClick={() => setRunResult(null)} aria-label="Dismiss result"><X size={14} /></button></div><p>{runResult.output}</p></div>}
          </section>
          <section className="hq-panel hq-room-detail">
            <div className="hq-panel-heading"><div><span className="hq-kicker">ROOM INSPECTOR</span><h3>{selectedRoom.name}</h3></div><span className="hq-room-detail-icon"><selectedRoom.icon size={17} /></span></div>
            <p>{selectedRoom.description}</p>
            <div className="hq-room-detail-members">{roomAgents(selectedRoom.id).map((agent) => <button key={agent.id} onClick={() => selectAgent(agent)}><AgentAvatar agent={agent} size="small" /><span>{agent.name}</span><ChevronRight size={12} /></button>)}</div>
          </section>
        </div>
      </div>

      <aside className="hq-side-column">
        <section className="hq-panel hq-agent-inspector">
          <div className="hq-panel-heading"><div><span className="hq-kicker">AGENT INSPECTOR</span><h3>Workforce detail</h3></div><span className="hq-inspector-live">REGISTRY</span></div>
          {selectedAgent ? <>
            <div className="hq-agent-hero"><AgentAvatar agent={selectedAgent} size="large" active={runningAgentId === selectedAgent.id || taskFor(selectedAgent)?.state === "In progress"} /><div><h2>{selectedAgent.name}</h2><p>{selectedAgent.title}</p><small>{selectedAgent.department}</small></div></div>
            <div className="hq-agent-state"><span className={runningAgentId === selectedAgent.id || taskFor(selectedAgent)?.state === "In progress" ? "working" : taskFor(selectedAgent)?.state === "Planned" ? "queued" : "standby"} />{runningAgentId === selectedAgent.id ? "Provider request executing" : taskFor(selectedAgent)?.state === "In progress" ? "In progress · PTMS task" : taskFor(selectedAgent)?.state === "Planned" ? "Queued · PTMS task" : taskFor(selectedAgent)?.state === "Blocked" ? "Blocked · PTMS task" : "Standby · no active task record"}</div>
            <div className="hq-agent-task"><span>CURRENT PTMS TASK</span><strong>{taskFor(selectedAgent)?.title || "No active task assigned"}</strong><small>{taskFor(selectedAgent)?.project || "Waiting for a saved assignment"}</small></div>
            <div className="hq-agent-facts"><div><span>REPORTS TO</span><strong>{selectedAgent.reportsTo || "Founder"}</strong></div><div><span>ROOM</span><strong>{rooms.find((room) => room.id === roomForAgent(selectedAgent))?.name || "Standby lounge"}</strong></div></div>
            <div className="hq-agent-responsibilities"><span>PRIMARY RESPONSIBILITY</span><p>{selectedAgent.responsibilities?.[0] || "Coordination and reporting"}</p></div>
            <button className="hq-agent-select-action" onClick={() => { setCommand(""); setRunResult(null); document.getElementById("hq-command-input")?.focus(); }}><MessageSquareText size={14} /> Prepare a task for {selectedAgent.name}</button>
            <div className="hq-agent-history"><span>ASSIGNED TASK HISTORY</span>{agentTasks(selectedAgent).slice(0, 4).map((task) => <div key={task.id}><span className={task.state === "Completed" ? "done" : task.state === "In progress" ? "working" : task.state === "Blocked" ? "blocked" : "queued"} /><p>{task.title}<small>{task.project} · {task.state}</small></p></div>)}{agentTasks(selectedAgent).length === 0 && <small>No saved PTMS tasks assigned to this agent.</small>}</div>
          </> : <p className="hq-muted">{registryError || "Loading the authoritative workforce registry…"}</p>}
        </section>

        <section className="hq-panel hq-roster-panel">
          <div className="hq-panel-heading"><div><span className="hq-kicker">DIRECTORY</span><h3>AI identities</h3></div><button className="hq-plain-button" onClick={() => setShowAllAgents((value) => !value)}>{showAllAgents ? "Compact" : "View all"}</button></div>
          <label className="hq-agent-search"><Search size={13} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find an agent…" /></label>
          <div className="hq-roster-list">{filteredAgents.slice(0, showAllAgents ? 14 : 7).map((agent) => {
            const state = stateFor(agent);
            return <button key={agent.id} className={selectedAgentId === agent.id ? "selected" : ""} onClick={() => selectAgent(agent)}><AgentAvatar agent={agent} size="small" active={state === "working"} state={state} /><span><strong>{agent.name}</strong><small>{agent.department}</small></span><i className={state} /></button>;
          })}</div>
          {registryError && <p className="hq-error-note">{registryError}</p>}
        </section>

        <section className="hq-panel hq-activity-panel">
          <div className="hq-panel-heading"><div><span className="hq-kicker">WORKSPACE SIGNALS</span><h3>Recent task activity</h3></div><Activity size={16} /></div>
          {tasks.slice(0, 5).map((task) => <div className="hq-activity-row" key={task.id}><span className={task.state === "Completed" ? "done" : task.state === "In progress" ? "working" : task.state === "Blocked" ? "blocked" : "queued"}>{task.state === "Completed" ? <CheckCircle2 size={12} /> : <FileText size={12} />}</span><div><strong>{task.title}</strong><small>{task.owner} · {task.project} · {task.state}</small></div></div>)}
          {tasks.length === 0 && <p className="hq-muted">No saved tasks yet. Task activity will appear here when records exist.</p>}
          <small className="hq-source-note">Source: authenticated PTMS task records · not a live agent event stream</small>
        </section>
      </aside>
    </div>
    {!registry && <div className="hq-loading-note">{registryError || "Connecting to the registered AI workforce…"}</div>}
  </section>;
}
