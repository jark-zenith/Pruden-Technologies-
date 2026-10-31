import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  Activity, ArrowUpRight, Bot, BriefcaseBusiness, CheckCircle2, ChevronRight, CircleDot,
  Cpu, Database, FileText, Github, Layers3, LoaderCircle, LockKeyhole, MessageSquareText,
  Monitor, Search, Send, ShieldCheck, Sparkles, Users, X, Zap
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./headquarters.css";

type Task = { id: string; title: string; project: string; priority: string; owner: string; state: string };
type Project = { id: string; name: string; status: string; progress: number; due: string };
type Approval = { id: string; title: string; detail: string; risk: string; status: string };
type Agent = {
  id: string; name: string; title: string; reportsTo?: string; responsibilities?: string[];
  allowedActions?: string[]; restrictedActions?: string[]; department?: string;
  presentationGender?: string; personality?: string; orbColor?: string;
};
type Department = { id: string; name: string; lead: string; independent?: boolean; agents: Agent[] };
type Registry = { ivy: Agent; departments: Department[] };
type FinanceRecord = { id: string; kind: "income" | "expense"; amount: number; currency: string; occurred_on: string; category: string };
type SavingsGoal = { id: string; name: string; target_amount: number; mpesa_amount: number; cash_amount: number; status: string };
type AuditEvent = { id: string; action: string; entity_type: string; created_at: string };
type SystemSnapshot = {
  health: { ok?: boolean; status?: string; [key: string]: unknown } | null;
  ivy: { configured?: boolean; provider?: string; model?: string; modelProviders?: Record<string, unknown>; [key: string]: unknown } | null;
  capabilities: Record<string, unknown> | null;
};
type Room = {
  id: string; name: string; subtitle: string; description: string; agentIds: string[];
  scene: "office" | "meeting" | "server" | "finance" | "engineering" | "studio" | "research" | "operations" | "security" | "training";
};

const rooms: Room[] = [
  { id: "executive", name: "CEO office", subtitle: "EXECUTIVE OFFICE", description: "Ivy's executive desk, company priorities and founder command channel.", agentIds: ["ivy"], scene: "office" },
  { id: "meeting", name: "Hologram meeting room", subtitle: "COUNCIL / COORDINATION", description: "The shared room for Ivy and the department leads. Presence is based on the registered workforce and saved PTMS task state.", agentIds: [], scene: "meeting" },
  { id: "server", name: "Server & device health", subtitle: "INFRASTRUCTURE", description: "Live application health and configured provider checks. CPU, RAM and device telemetry remain unavailable until a monitoring agent is connected.", agentIds: [], scene: "server" },
  { id: "finance", name: "Finance showcase", subtitle: "FINANCE / READ ONLY", description: "A read-only view of the authenticated finance ledger and savings goals.", agentIds: [], scene: "finance" },
  { id: "engineering", name: "Engineering room", subtitle: "ENGINEERING & AI SYSTEMS", description: "The engineering team works on software, interfaces, backend integrations and automation.", agentIds: ["forge", "pixel", "stack", "vector"], scene: "engineering" },
  { id: "studio", name: "Media studio", subtitle: "PRUDEN STUDIOS", description: "Creative direction, visual assets, editing plans and media production.", agentIds: ["lumi", "motion"], scene: "studio" },
  { id: "opportunities", name: "Opportunity Hub", subtitle: "GROWTH & INTELLIGENCE", description: "Atlas and Nova organise source-backed opportunities, market research and strategic intelligence.", agentIds: ["atlas", "nova"], scene: "research" },
  { id: "departments", name: "Department offices", subtitle: "CLIENTS & OPERATIONS", description: "Client intake, business development, project delivery and company knowledge.", agentIds: ["echo", "mira", "relay", "vault"], scene: "operations" },
  { id: "security", name: "Security and audit", subtitle: "INDEPENDENT REVIEW", description: "Sentinel reviews quality, risk and recorded company activity independently.", agentIds: ["sentinel"], scene: "security" },
  { id: "training", name: "AI training room", subtitle: "MODEL EVALUATION", description: "Provider configuration and model readiness. Evaluation history will appear when a test-run store is connected.", agentIds: [], scene: "training" }
];

const agentRoom: Record<string, string> = {
  ivy: "executive", atlas: "opportunities", nova: "opportunities", echo: "departments", mira: "departments",
  forge: "engineering", pixel: "engineering", stack: "engineering", vector: "engineering",
  sentinel: "security", lumi: "studio", motion: "studio", relay: "departments", vault: "departments"
};
const normalize = (value: string) => value.trim().toLowerCase();
const money = (value: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value || 0);
const initials = (name: string) => name.slice(0, 1).toUpperCase();

function AgentOrb({ agent, state = "standby", size = "normal" }: { agent: Agent; state?: string; size?: "small" | "normal" }) {
  return <span className={"hq-orb " + size + " " + state} style={{ "--orb-color": agent.orbColor || "#3d8bff" } as CSSProperties} title={agent.name}>
    <b>{initials(agent.name)}</b><i />
  </span>;
}

function Scene({ type }: { type: Room["scene"] }) {
  return <span className={"hq-scene scene-" + type} aria-hidden="true">
    {type === "server" ? <><i className="rack" /><i className="rack" /><i className="rack" /><i className="screen" /></> :
      type === "meeting" ? <><i className="table" /><i className="holo" /><i className="screen" /></> :
      type === "finance" ? <><i className="screen" /><i className="screen second" /><i className="desk" /><i className="desk second" /></> :
      type === "security" ? <><i className="rack" /><i className="rack second" /><i className="desk" /><i className="screen" /></> :
      type === "studio" ? <><i className="table" /><i className="desk" /><i className="desk second" /><i className="screen" /></> :
      type === "research" ? <><i className="screen" /><i className="screen second" /><i className="desk" /><i className="desk second" /><i className="desk third" /></> :
      type === "training" ? <><i className="rack" /><i className="desk" /><i className="desk second" /><i className="screen" /></> :
      <><i className="desk" /><i className="desk second" /><i className="desk third" /><i className="sofa" /><i className="screen" /></>}
  </span>;
}

export default function HeadquartersPage({ tasks, projects = [], approvals = [] }: { tasks: Task[]; projects?: Project[]; approvals?: Approval[] }) {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [registryError, setRegistryError] = useState("");
  const [system, setSystem] = useState<SystemSnapshot>({ health: null, ivy: null, capabilities: null });
  const [systemError, setSystemError] = useState("");
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [financeState, setFinanceState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("ivy");
  const [command, setCommand] = useState("");
  const [runningAgentId, setRunningAgentId] = useState("");
  const [runResult, setRunResult] = useState<{ agent: Agent; output: string; state: "success" | "error" } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const agents = useMemo(() => registry ? [
    { ...registry.ivy, department: "Executive Office" },
    ...registry.departments.flatMap((department) => department.agents.map((agent) => ({ ...agent, department: department.name })))
  ] : [], [registry]);

  const agentFor = (id: string) => agents.find((agent) => agent.id === id);
  const taskFor = (agent: Agent) => tasks.find((task) => normalize(task.owner) === normalize(agent.name) && task.state === "In progress")
    || tasks.find((task) => normalize(task.owner) === normalize(agent.name) && task.state === "Planned")
    || tasks.find((task) => normalize(task.owner) === normalize(agent.name) && task.state === "Blocked");
  const stateFor = (agent: Agent) => runningAgentId === agent.id ? "working" : taskFor(agent)?.state === "In progress" ? "working" : taskFor(agent)?.state === "Planned" ? "queued" : taskFor(agent)?.state === "Blocked" ? "blocked" : "standby";
  const roomForAgent = (agent: Agent) => {
    const task = taskFor(agent)?.title || "";
    if (/\b(print|printing|printer)\b/i.test(task)) return "studio";
    if (/\b(server|infrastructure|backup|deployment|deploy|logs|monitoring)\b/i.test(task)) return "server";
    return agentRoom[agent.id] || "departments";
  };
  const membersFor = (room: Room) => room.id === "meeting" ? agents : room.id === "server" || room.id === "finance" || room.id === "training" ? [] : agents.filter((agent) => roomForAgent(agent) === room.id);
  const activeTasks = tasks.filter((task) => task.state === "In progress");
  const queuedTasks = tasks.filter((task) => task.state === "Planned");
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;
  const selectedAgent = agentFor(selectedAgentId) || agents[0] || null;
  const income = finance.filter((record) => record.kind === "income").reduce((sum, record) => sum + Number(record.amount), 0);
  const expenses = finance.filter((record) => record.kind === "expense").reduce((sum, record) => sum + Number(record.amount), 0);
  const savings = goals.reduce((sum, goal) => sum + Number(goal.mpesa_amount) + Number(goal.cash_amount), 0);
  const providers = system.ivy?.modelProviders || {};

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const results = await Promise.allSettled([
        fetch("/api/workforce/agents", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Workforce registry request failed (" + response.status + ").");
          return response.json() as Promise<Registry>;
        }),
        fetch("/health", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Application health endpoint returned " + response.status + ".");
          return response.json();
        }),
        fetch("/api/ivy/status", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Ivy provider status returned " + response.status + ".");
          return response.json();
        }),
        fetch("/api/ivy/capabilities", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Ivy capability endpoint returned " + response.status + ".");
          return response.json();
        })
      ]);
      if (!alive) return;
      if (results[0].status === "fulfilled") { setRegistry(results[0].value); setRegistryError(""); }
      else setRegistryError(results[0].reason instanceof Error ? results[0].reason.message : "Workforce registry unavailable.");
      const health = results[1].status === "fulfilled" ? results[1].value : null;
      const ivy = results[2].status === "fulfilled" ? results[2].value : null;
      const capabilities = results[3].status === "fulfilled" ? results[3].value : null;
      setSystem({ health, ivy, capabilities });
      const failures = results.slice(1).filter((result) => result.status === "rejected");
      setSystemError(failures.length ? "Some system endpoints could not be reached." : "");
      setLastUpdated(new Date());
    };
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadFinance = async () => {
      if (!supabase) { setFinanceState("unavailable"); return; }
      const [ledger, savingsRows, auditRows] = await Promise.all([
        supabase.from("pruden_financial_records").select("id,kind,amount,currency,occurred_on,category").order("occurred_on", { ascending: false }).limit(200),
        supabase.from("pruden_savings_goals").select("id,name,target_amount,mpesa_amount,cash_amount,status").order("updated_at", { ascending: false }),
        supabase.from("pruden_audit_events").select("id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(10)
      ]);
      if (!alive) return;
      if (ledger.error || savingsRows.error) {
        setFinanceState("error");
        setFinance([]);
        setGoals([]);
      } else {
        setFinance((ledger.data || []) as FinanceRecord[]);
        setGoals((savingsRows.data || []) as SavingsGoal[]);
        setFinanceState("ready");
      }
      setAudit(auditRows.error ? [] : (auditRows.data || []) as AuditEvent[]);
    };
    void loadFinance();
    return () => { alive = false; };
  }, []);

  function openRoom(id: string) {
    setSelectedRoomId(id);
    setRunResult(null);
    const room = rooms.find((item) => item.id === id);
    const first = room ? membersFor(room)[0] : null;
    if (first) setSelectedAgentId(first.id);
  }

  async function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent || !command.trim() || runningAgentId) return;
    const task = command.trim();
    setRunningAgentId(selectedAgent.id);
    setRunResult(null);
    try {
      const response = await fetch("/api/workforce/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent.id, task })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The agent run did not complete.");
      setRunResult({ agent: selectedAgent, output: String(data.output || "The agent returned no text output."), state: "success" });
      setCommand("");
    } catch (error) {
      setRunResult({ agent: selectedAgent, output: error instanceof Error ? error.message : "Agent request failed.", state: "error" });
    } finally {
      setRunningAgentId("");
    }
  }

  const roomIcon = (id: string) => {
    const icons: Record<string, typeof Activity> = {
      executive: BriefcaseBusiness, meeting: Users, server: Monitor, finance: Database,
      engineering: Cpu, studio: Sparkles, opportunities: Search, departments: Layers3,
      security: ShieldCheck, training: Zap
    };
    return icons[id] || Activity;
  };

  return <section className="virtual-hq" aria-label="Pruden Technologies virtual headquarters">
    <div className="hq-floor-meta"><span className="hq-brand"><b>PRUDEN</b> TECHNOLOGIES <i>·</i> VIRTUAL HEADQUARTERS</span><span className="hq-live-state"><i /> {registry ? agents.length + " AGENTS REGISTERED" : "CONNECTING WORKFORCE"}</span></div>
    <div className="hq-floor" role="group" aria-label="Headquarters rooms">
      {rooms.map((room, index) => {
        const members = membersFor(room);
        const working = members.filter((agent) => stateFor(agent) === "working").length;
        const Icon = roomIcon(room.id);
        return <button key={room.id} className={"hq-room hq-room-" + room.id} onClick={() => openRoom(room.id)} aria-label={"Open " + room.name}>
          <span className="hq-room-label"><span><small>{room.subtitle}</small><strong>{room.name}</strong></span><b>{room.id === "server" ? (system.health?.ok ? "LIVE" : "—") : room.id === "finance" ? (financeState === "ready" ? "LIVE" : "—") : String(members.length).padStart(2, "0")}</b></span>
          <Scene type={room.scene} />
          <span className="hq-room-agent-row">
            {members.slice(0, 5).map((agent) => <span key={agent.id} className="hq-agent-pin" title={agent.name + " · " + stateFor(agent)}><AgentOrb agent={agent} state={stateFor(agent)} size="small" /><small>{agent.name}</small></span>)}
            {members.length > 5 && <small className="hq-overflow">+{members.length - 5}</small>}
          </span>
          <span className="hq-room-footer"><span><Icon size={11} /> {room.id === "meeting" ? working + " working · " + queuedTasks.length + " queued" : room.id === "server" ? (systemError ? "Partial telemetry" : "Application health") : room.id === "finance" ? (financeState === "ready" ? "Ledger connected" : "Awaiting finance data") : room.description}</span><ChevronRight size={13} /></span>
        </button>;
      })}
      <div className="hq-expansion-room" aria-label="Reserved for future expansion"><span>FUTURE EXPANSION</span><b>+</b><small>ROOM 11 · RESERVED</small></div>
      <button className="hq-command-hub" onClick={() => openRoom("executive")} aria-label="Open central command hub"><i className="hq-hub-ring" /><span>PT</span><small>COMMAND CORE</small></button>
    </div>
    <div className="hq-floor-legend"><span><i className="working" /> Working</span><span><i className="queued" /> Queued</span><span><i className="blocked" /> Blocked</span><span><i className="standby" /> Standby</span><span className="hq-floor-updated">{lastUpdated ? "SYNCED " + lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "SYNCING LIVE DATA"}</span></div>

    {selectedRoom && <div className="hq-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRoomId(""); }}>
      <section className="hq-room-dialog" role="dialog" aria-modal="true" aria-labelledby="hq-dialog-title">
        <header><div><small>{selectedRoom.subtitle}</small><h2 id="hq-dialog-title">{selectedRoom.name}</h2></div><button onClick={() => setSelectedRoomId("")} aria-label="Close room"><X size={18} /></button></header>
        <div className="hq-dialog-body">
          <p className="hq-room-description">{selectedRoom.description}</p>
          {selectedRoom.id === "executive" && <>
            <div className="hq-stat-grid"><article><small>OPEN PRIORITIES</small><b>{tasks.filter((task) => !["Completed", "Cancelled"].includes(task.state)).length}</b></article><article><small>ACTIVE PROJECTS</small><b>{projects.filter((project) => project.status === "active").length}</b></article><article><small>PENDING APPROVALS</small><b>{approvals.filter((approval) => approval.status === "Awaiting decision").length}</b></article></div>
            <h3>Founder priorities</h3>
            <div className="hq-data-list">{tasks.slice(0, 6).map((task) => <div key={task.id}><span><b>{task.title}</b><small>{task.project} · {task.owner}</small></span><em>{task.state}</em></div>)}{!tasks.length && <p className="hq-empty">No task records are available in this workspace yet.</p>}</div>
            <h3>Approval queue</h3><div className="hq-data-list">{approvals.slice(0, 4).map((approval) => <div key={approval.id}><span><b>{approval.title}</b><small>{approval.detail}</small></span><em>{approval.status}</em></div>)}{!approvals.length && <p className="hq-empty">No approval records are waiting.</p>}</div>
          </>}
          {selectedRoom.id === "meeting" && <>
            <div className="hq-stat-grid"><article><small>REGISTERED</small><b>{agents.length}</b></article><article><small>WORKING</small><b>{activeTasks.length}</b></article><article><small>QUEUED</small><b>{queuedTasks.length}</b></article></div>
            <h3>Company council</h3><div className="hq-agent-list">{agents.map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)}><AgentOrb agent={agent} state={stateFor(agent)} /><span><b>{agent.name}</b><small>{agent.title}</small></span><em>{stateFor(agent)}</em></button>)}</div>
          </>}
          {selectedRoom.id === "server" && <>
            <div className="hq-stat-grid"><article><small>APP HEALTH</small><b>{system.health?.ok ? "OK" : system.health ? "CHECK" : "UNKNOWN"}</b></article><article><small>IVY API</small><b>{system.ivy ? "RESPONDING" : "UNKNOWN"}</b></article><article><small>PROVIDERS</small><b>{Object.keys(providers).length || "—"}</b></article></div>
            <h3>Connected runtime checks</h3><div className="hq-data-list"><div><span><b>PTMS application</b><small>/health endpoint</small></span><em>{system.health?.ok ? "Healthy" : "Not verified"}</em></div><div><span><b>Ivy status API</b><small>Provider configuration endpoint</small></span><em>{system.ivy ? "Responding" : "Unavailable"}</em></div><div><span><b>Workforce registry</b><small>Registered AI identities</small></span><em>{registry ? "Connected" : registryError || "Unavailable"}</em></div><div><span><b>Device telemetry</b><small>CPU, memory, temperature and physical devices</small></span><em>Not connected</em></div></div>
            <p className="hq-note">The room does not simulate CPU or memory readings. Only real endpoint responses are shown.</p>
          </>}
          {selectedRoom.id === "finance" && <>
            {financeState === "ready" ? <><div className="hq-stat-grid"><article><small>RECORDED INCOME</small><b>{money(income)}</b></article><article><small>RECORDED EXPENSES</small><b>{money(expenses)}</b></article><article><small>SAVINGS ALLOCATED</small><b>{money(savings)}</b></article></div><h3>Recent ledger entries</h3><div className="hq-data-list">{finance.slice(0, 8).map((record) => <div key={record.id}><span><b>{record.category}</b><small>{record.kind} · {record.occurred_on}</small></span><em>{money(Number(record.amount))}</em></div>)}{!finance.length && <p className="hq-empty">No financial records have been entered yet.</p>}</div><h3>Savings goals</h3><div className="hq-data-list">{goals.slice(0, 5).map((goal) => <div key={goal.id}><span><b>{goal.name}</b><small>{money(Number(goal.mpesa_amount) + Number(goal.cash_amount))} of {money(Number(goal.target_amount))}</small></span><em>{goal.status}</em></div>)}{!goals.length && <p className="hq-empty">No savings goals have been recorded.</p>}</div></> : <p className="hq-empty">{financeState === "loading" ? "Loading finance records…" : financeState === "unavailable" ? "Supabase is not configured in this client." : "Finance records could not be loaded. Check the authenticated Supabase session and table policies."}</p>}
          </>}
          {selectedRoom.id === "engineering" && <><h3>Engineering workforce</h3><div className="hq-agent-list">{membersFor(selectedRoom).map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)}><AgentOrb agent={agent} state={stateFor(agent)} /><span><b>{agent.name}</b><small>{agent.title}</small></span><em>{agentTasksLabel(tasks, agent)}</em></button>)}</div><h3>Engineering tasks</h3><TaskList tasks={tasks.filter((task) => ["Forge", "Pixel", "Stack", "Vector"].includes(task.owner))} /></>}
          {selectedRoom.id === "studio" && <><h3>Creative workforce</h3><div className="hq-agent-list">{membersFor(selectedRoom).map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)}><AgentOrb agent={agent} state={stateFor(agent)} /><span><b>{agent.name}</b><small>{agent.title}</small></span><em>{stateFor(agent)}</em></button>)}</div><TaskList tasks={tasks.filter((task) => ["Lumi", "Motion"].includes(task.owner))} /></>}
          {selectedRoom.id === "opportunities" && <><h3>Opportunity intelligence</h3><div className="hq-agent-list">{membersFor(selectedRoom).map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)}><AgentOrb agent={agent} state={stateFor(agent)} /><span><b>{agent.name}</b><small>{agent.title}</small></span><em>{stateFor(agent)}</em></button>)}</div><p className="hq-note">Live opportunity listings are not stored in the room yet. This view only shows the registered research agents and their PTMS task assignments.</p><TaskList tasks={tasks.filter((task) => ["Atlas", "Nova"].includes(task.owner))} /></>}
          {selectedRoom.id === "departments" && <><h3>Department workforce</h3><div className="hq-agent-list">{membersFor(selectedRoom).map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(agent.id)}><AgentOrb agent={agent} state={stateFor(agent)} /><span><b>{agent.name}</b><small>{agent.title}</small></span><em>{stateFor(agent)}</em></button>)}</div><TaskList tasks={tasks.filter((task) => ["Echo", "Mira", "Relay", "Vault"].includes(task.owner))} /></>}
          {selectedRoom.id === "security" && <><div className="hq-stat-grid"><article><small>RECENT AUDIT EVENTS</small><b>{audit.length}</b></article><article><small>OPEN APPROVALS</small><b>{approvals.filter((approval) => approval.status === "Awaiting decision").length}</b></article><article><small>BLOCKED TASKS</small><b>{tasks.filter((task) => task.state === "Blocked").length}</b></article></div><h3>Recent audit activity</h3><div className="hq-data-list">{audit.map((event) => <div key={event.id}><span><b>{event.action.replace(/[._-]/g, " ")}</b><small>{event.entity_type} · {new Date(event.created_at).toLocaleString()}</small></span><em>Recorded</em></div>)}{!audit.length && <p className="hq-empty">No audit events are available from the current session.</p>}</div><p className="hq-note">Sentinel is an independent reviewer. This panel reports stored records; it does not imply an automated security scan has run.</p></>}
          {selectedRoom.id === "training" && <><div className="hq-stat-grid"><article><small>IVY API</small><b>{system.ivy ? "ONLINE" : "UNKNOWN"}</b></article><article><small>TEXT MODEL KEY</small><b>{system.ivy?.configured ? "CONFIGURED" : "NOT CONFIGURED"}</b></article><article><small>MODEL PROVIDERS</small><b>{Object.keys(providers).length}</b></article></div><h3>Provider status</h3><div className="hq-data-list"><div><span><b>{String(system.ivy?.provider || "Primary provider")}</b><small>{String(system.ivy?.model || "Model not reported")}</small></span><em>{system.ivy?.configured ? "Configured" : "Not configured"}</em></div>{Object.entries(providers).map(([name, value]) => <div key={name}><span><b>{name}</b><small>{typeof value === "object" && value ? JSON.stringify(value) : String(value)}</small></span><em>Reported by API</em></div>)}</div><p className="hq-note">A configured key is not the same as a successful model evaluation. Evaluation runs will be added when test history is persisted.</p></>}
          {selectedRoom.id === "engineering" || selectedRoom.id === "studio" || selectedRoom.id === "opportunities" || selectedRoom.id === "departments" ? null : null}
          {selectedRoom.id !== "finance" && selectedRoom.id !== "server" && selectedRoom.id !== "training" && selectedRoom.id !== "security" && selectedRoom.id !== "executive" && selectedRoom.id !== "meeting" && <></>}
          {selectedAgent && <div className="hq-selected-agent"><div className="hq-selected-agent-head"><AgentOrb agent={selectedAgent} state={stateFor(selectedAgent)} /><span><b>{selectedAgent.name}</b><small>{selectedAgent.title}</small></span><em>{stateFor(selectedAgent)}</em></div><form onSubmit={runCommand}><label htmlFor="hq-room-command">SEND A TASK TO {selectedAgent.name.toUpperCase()}</label><div><input id="hq-room-command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Describe the task…" maxLength={10000} disabled={Boolean(runningAgentId)} /><button type="submit" disabled={!command.trim() || Boolean(runningAgentId)}>{runningAgentId === selectedAgent.id ? <LoaderCircle className="hq-spin" size={15} /> : <Send size={15} />} RUN</button></div></form></div>}
          {runResult && <div className={"hq-run-result " + runResult.state}><div><b>{runResult.state === "success" ? runResult.agent.name + " responded" : "Agent run failed"}</b><button onClick={() => setRunResult(null)} aria-label="Dismiss result"><X size={14} /></button></div><p>{runResult.output}</p></div>}
        </div>
      </section>
    </div>}
  </section>;
}

function agentTasksLabel(tasks: Task[], agent: Agent) {
  const count = tasks.filter((task) => normalize(task.owner) === normalize(agent.name) && !["Completed", "Cancelled"].includes(task.state)).length;
  return count + " open";
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return <div className="hq-data-list">{tasks.slice(0, 8).map((task) => <div key={task.id}><span><b>{task.title}</b><small>{task.project} · {task.owner}</small></span><em>{task.state}</em></div>)}{!tasks.length && <p className="hq-empty">No saved tasks for this room.</p>}</div>;
}
