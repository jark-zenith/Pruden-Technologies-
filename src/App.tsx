import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Bot, BriefcaseBusiness,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command,
  CreditCard, Database, FileText, FolderKanban, Gauge, GitBranch, LayoutDashboard,
  ListTodo, LockKeyhole, Menu, Plus, Search, Settings2, ShieldCheck,
  Sparkles, Users, X, Zap,
  type LucideIcon,
} from "lucide-react";

type ModuleKey =
  | "Overview" | "Projects" | "Tasks" | "AI Workforce" | "Approvals"
  | "Customers & CRM" | "Finance" | "Products & Services" | "Infrastructure"
  | "Security & Audit" | "Knowledge Base" | "Reports & Settings";

type NavItem = { label: ModuleKey; icon: LucideIcon; group: string; badge?: string };

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Projects", icon: FolderKanban, group: "WORKSPACE" },
  { label: "Tasks", icon: ListTodo, group: "WORKSPACE", badge: "08" },
  { label: "AI Workforce", icon: Bot, group: "INTELLIGENCE" },
  { label: "Approvals", icon: ShieldCheck, group: "INTELLIGENCE", badge: "03" },
  { label: "Customers & CRM", icon: Users, group: "BUSINESS" },
  { label: "Finance", icon: CreditCard, group: "BUSINESS" },
  { label: "Products & Services", icon: BriefcaseBusiness, group: "BUSINESS" },
  { label: "Infrastructure", icon: Database, group: "SYSTEMS" },
  { label: "Security & Audit", icon: LockKeyhole, group: "SYSTEMS" },
  { label: "Knowledge Base", icon: FileText, group: "SYSTEMS" },
  { label: "Reports & Settings", icon: Settings2, group: "SYSTEMS" },
];

const projects = [
  { name: "PRUDEN Command", tag: "INTERNAL PLATFORM", progress: 28, status: "In progress", tone: "blue", owner: "Product & Engineering", due: "Foundation phase" },
  { name: "PichaHub", tag: "CREATOR PLATFORM", progress: 64, status: "Active", tone: "cyan", owner: "Product team", due: "Verify current release" },
  { name: "Deon", tag: "PROMPT MARKETPLACE", progress: 42, status: "Needs review", tone: "violet", owner: "Product team", due: "Payments & assets review" },
];

const tasks = [
  { title: "Define organization roles and permissions", project: "PRUDEN Command", priority: "High", owner: "Founder", state: "Planned" },
  { title: "Map the existing repository and deployment", project: "PRUDEN Command", priority: "High", owner: "Engineering", state: "In progress" },
  { title: "Design approval and audit event model", project: "PRUDEN Command", priority: "Medium", owner: "Engineering", state: "Planned" },
  { title: "Verify PichaHub release status", project: "PichaHub", priority: "High", owner: "Product", state: "Needs evidence" },
];

const approvals = [
  { title: "Agent access policy", detail: "Define permitted reads and proposed writes", risk: "Security", status: "Awaiting decision" },
  { title: "Production release gate", detail: "Require test evidence and human sign-off", risk: "Release", status: "Draft" },
  { title: "Team role matrix", detail: "Set least-privilege access by role", risk: "Access", status: "Awaiting decision" },
];

const descriptions: Record<ModuleKey, string> = {
  "Overview": "Your operating picture, priorities and decisions in one place.",
  "Projects": "Track outcomes, owners, milestones, budgets and delivery health.",
  "Tasks": "Turn priorities into owned work with acceptance criteria and evidence.",
  "AI Workforce": "Register agents, scope their capabilities and review their runs.",
  "Approvals": "Review consequential actions before anything is executed.",
  "Customers & CRM": "Manage leads, customer relationships and delivery hand-offs.",
  "Finance": "Monitor verified financial records, budgets and operating costs.",
  "Products & Services": "Maintain the catalogue, product owners and release status.",
  "Infrastructure": "Track repositories, environments, providers and service health.",
  "Security & Audit": "Review access, audit events, risks and incident readiness.",
  "Knowledge Base": "Keep company decisions, playbooks and technical notes searchable.",
  "Reports & Settings": "Configure your workspace, team, notifications and reporting.",
};

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span>P</span><i /></div>;
}

function StatusDot({ tone = "blue" }: { tone?: string }) {
  return <span className={`status-dot ${tone}`} />;
}

function SectionHeading({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{right}</div>;
}

export default function App() {
  const [active, setActive] = useState<ModuleKey>("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCreated, setTaskCreated] = useState(false);
  const [localTasks, setLocalTasks] = useState(() => {
    try {
      const saved = window.localStorage.getItem("pruden-command-demo-tasks");
      return saved ? (JSON.parse(saved) as typeof tasks) : tasks;
    } catch {
      return tasks;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("pruden-command-demo-tasks", JSON.stringify(localTasks));
    } catch {
      // The dashboard remains usable if browser storage is unavailable.
    }
  }, [localTasks]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearch("");
        setShowNotifications(false);
        setShowQuickAdd(false);
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredNav = useMemo(
    () => navItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const chooseModule = (label: ModuleKey) => {
    setActive(label);
    setMobileNav(false);
    setSearch("");
  };

  const createDraftTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    setLocalTasks((current) => [{ title, project: "PRUDEN Command", priority: "Medium", owner: "Unassigned", state: "Draft — local only" }, ...current]);
    setTaskTitle("");
    setTaskCreated(true);
    setShowQuickAdd(false);
  };

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <BrandMark />
          {!collapsed && <div className="brand-copy"><strong>PRUDEN<span>COMMAND</span></strong><small>TECHNOLOGY OPERATIONS</small></div>}
          <button className="icon-button collapse-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}><ChevronLeft size={16} /></button>
        </div>
        <button className="workspace-switch" onClick={() => chooseModule("Reports & Settings")} title="Open workspace settings">
          <div className="workspace-avatar">P</div>
          {!collapsed && <><div className="workspace-label"><strong>PRUDEN Technologies</strong><span>Team workspace</span></div><ChevronDown size={15} /></>}
        </button>
        <div className="nav-scroll">
          {["WORKSPACE", "INTELLIGENCE", "BUSINESS", "SYSTEMS"].map((group) => (
            <div className="nav-group" key={group}>
              {!collapsed && <p className="nav-group-label">{group}</p>}
              {filteredNav.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                return <button key={item.label} className={`nav-item ${active === item.label ? "active" : ""}`} onClick={() => chooseModule(item.label)} title={collapsed ? item.label : undefined}>
                  <Icon size={17} strokeWidth={1.8} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && <b className="nav-badge">{item.badge}</b>}
                </button>;
              })}
            </div>
          ))}
          {filteredNav.length === 0 && !collapsed && <p className="empty-nav">No matching modules</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="system-status"><span className="pulse" />{!collapsed && <><span>Prototype mode</span><span className="status-caption">No live services</span></>}</div>
          <button className="profile-row" onClick={() => chooseModule("Reports & Settings")}>
            <div className="profile-avatar">PJ</div>
            {!collapsed && <div className="profile-info"><strong>Founder workspace</strong><span>Role setup pending</span></div>}
            {!collapsed && <ChevronDown size={14} />}
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
            <div className="breadcrumb"><span>PRUDEN</span><ChevronRight size={13} /><strong>{active}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={16} /><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a module..." aria-label="Find a module" /><kbd>⌘ K</kbd></label>
            <button className={`icon-button notification-button ${showNotifications ? "selected" : ""}`} aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}><Bell size={17} /><i /></button>
            <div className="top-avatar" title="Founder workspace">PJ</div>
          </div>
        </header>

        {showNotifications && <div className="notification-popover"><div className="popover-head"><strong>Notifications</strong><button className="text-button" onClick={() => setShowNotifications(false)}>Close</button></div><div className="notice-item"><span className="notice-icon"><ShieldCheck size={16} /></span><div><strong>Security setup pending</strong><p>Configure team roles before connecting real data.</p><small>Setup reminder · Prototype</small></div></div><div className="notice-item"><span className="notice-icon"><GitBranch size={16} /></span><div><strong>Agent gateway not connected</strong><p>No provider actions are available in this prototype.</p><small>System status</small></div></div></div>}

        <div className="content-wrap">
          <div className="prototype-banner"><span><Activity size={14} /> PROTOTYPE</span><p>Preview interface · Demo records only · Authentication and integrations are not connected</p><button onClick={() => chooseModule("Infrastructure")}>View system status <ArrowRight size={13} /></button></div>

          {active === "Overview" ? (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow"><span className="live-indicator" /> COMMAND CENTRE / 01</p><h1>Good to see you, <em>Founder.</em></h1><p className="welcome-subtitle">Here’s your current operating picture. Build with clarity, move with intent.</p></div>
                <button className="primary-button" onClick={() => { setTaskCreated(false); setShowQuickAdd(true); }}><Plus size={16} /> Create task</button>
              </section>

              <section className="metric-grid" aria-label="Workspace overview metrics">
                <article className="metric-card"><div className="metric-top"><span>Active projects</span><span className="metric-icon blue"><FolderKanban size={17} /></span></div><div className="metric-value">03 <small>demo</small></div><div className="metric-foot"><span className="metric-note"><Activity size={13} /> Sample workspace</span><span className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="metric-card"><div className="metric-top"><span>Open tasks</span><span className="metric-icon cyan"><ListTodo size={17} /></span></div><div className="metric-value">{String(localTasks.length).padStart(2, "0")} <small>demo</small></div><div className="metric-foot"><span className="metric-note">Not connected to a database</span><span className="mini-bars cyan-bars"><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="metric-card"><div className="metric-top"><span>Pending approvals</span><span className="metric-icon amber"><ShieldCheck size={17} /></span></div><div className="metric-value">03 <small>sample</small></div><div className="metric-foot"><span className="metric-note">Human review required</span><span className="mini-bars amber-bars"><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="metric-card"><div className="metric-top"><span>Agent gateway</span><span className="metric-icon violet"><Bot size={17} /></span></div><div className="metric-value gateway-value"><span className="offline-ring" /> Offline</div><div className="metric-foot"><span className="metric-note">No provider connected</span><span className="metric-link" onClick={() => chooseModule("AI Workforce")}>Configure <ArrowUpRight size={13} /></span></div></article>
              </section>

              <section className="main-grid">
                <div className="panel projects-panel">
                  <SectionHeading eyebrow="PORTFOLIO" title="Project pulse" right={<button className="text-button" onClick={() => chooseModule("Projects")}>All projects <ArrowRight size={13} /></button>} />
                  <div className="project-list">{projects.map((project) => <button className="project-row" key={project.name} onClick={() => chooseModule("Projects")}><div className={`project-symbol ${project.tone}`}>{project.name === "PRUDEN Command" ? <Command size={18} /> : project.name === "PichaHub" ? <Sparkles size={18} /> : <Zap size={18} />}</div><div className="project-main"><div className="project-name-row"><strong>{project.name}</strong><span className={`status-pill ${project.tone}`}><StatusDot tone={project.tone} />{project.status}</span></div><p>{project.tag} <span>·</span> {project.owner}</p><div className="progress-track"><span className={project.tone} style={{ width: `${project.progress}%` }} /></div></div><div className="project-progress"><strong>{project.progress}%</strong><small>{project.due}</small></div></button>)}</div>
                </div>
                <div className="panel priority-panel">
                  <SectionHeading eyebrow="FOCUS QUEUE" title="Next priorities" right={<span className="count-badge">04</span>} />
                  <div className="priority-list">{localTasks.slice(0, 4).map((task, index) => <button className="priority-row" key={task.title} onClick={() => chooseModule("Tasks")}><span className={`priority-index ${task.priority.toLowerCase()}`}>{String(index + 1).padStart(2, "0")}</span><span className="priority-copy"><strong>{task.title}</strong><small>{task.project} · {task.owner}</small></span><ArrowUpRight size={14} /></button>)}</div>
                  <button className="panel-bottom-link" onClick={() => chooseModule("Tasks")}>Open task board <ArrowRight size={14} /></button>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel approvals-panel"><SectionHeading eyebrow="CONTROL LAYER" title="Approval queue" right={<button className="text-button" onClick={() => chooseModule("Approvals")}>Review all <ArrowRight size={13} /></button>} /><div className="approval-list">{approvals.map((approval) => <div className="approval-row" key={approval.title}><span className="approval-symbol"><LockKeyhole size={15} /></span><div className="approval-copy"><strong>{approval.title}</strong><p>{approval.detail}</p></div><span className="approval-tag">{approval.risk}</span></div>)}</div><div className="approval-footer"><ShieldCheck size={14} /><span>Consequential actions stay human-approved.</span></div></div>
                <div className="panel system-panel"><SectionHeading eyebrow="SYSTEM HEALTH" title="Connected services" right={<span className="neutral-tag">0 connected</span>} /><div className="service-list"><div className="service-row"><span className="service-icon"><GitBranch size={16} /></span><span><strong>GitHub</strong><small>Repository metadata</small></span><span className="service-state"><i /> Not connected</span></div><div className="service-row"><span className="service-icon"><Database size={16} /></span><span><strong>PostgreSQL</strong><small>Application database</small></span><span className="service-state"><i /> Not connected</span></div><div className="service-row"><span className="service-icon"><Bot size={16} /></span><span><strong>Agent gateway</strong><small>Provider-neutral API</small></span><span className="service-state"><i /> Not connected</span></div></div><button className="panel-bottom-link" onClick={() => chooseModule("Infrastructure")}>Integration settings <ArrowRight size={14} /></button></div>
              </section>
              <footer className="footer-note"><span>PRUDEN COMMAND <b>·</b> BUILD. LEARN. INVENT. EVOLVE.</span><span><StatusDot tone="amber" /> Demo mode — no live data</span></footer>
            </>
          ) : (
            <ModulePage active={active} onCreateTask={() => setShowQuickAdd(true)} localTasks={localTasks} />
          )}
        </div>
      </main>

      {showQuickAdd && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowQuickAdd(false); }}><section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-head"><div><p className="eyebrow">WORKSPACE / TASKS</p><h2 id="task-modal-title">Create a task draft</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setShowQuickAdd(false)}><X size={17} /></button></div><p className="modal-description">Drafts are saved in this browser only. They are not synced to a server or shared with other devices.</p><label className="field-label" htmlFor="task-title">Task title</label><input id="task-title" className="task-input" autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createDraftTask(); }} placeholder="e.g. Define team permission matrix" /><div className="modal-foot"><button className="secondary-button" onClick={() => setShowQuickAdd(false)}>Cancel</button><button className="primary-button" onClick={createDraftTask} disabled={!taskTitle.trim()}><Plus size={15} /> Add draft</button></div></section></div>}
      {taskCreated && <div className="toast"><Check size={16} /><span>Draft added locally. It has not been saved to a server.</span><button aria-label="Dismiss notification" onClick={() => setTaskCreated(false)}><X size={14} /></button></div>}
    </div>
  );
}

function ModulePage({ active, onCreateTask, localTasks }: { active: ModuleKey; onCreateTask: () => void; localTasks: typeof tasks }) {
  const item = navItems.find((nav) => nav.label === active);
  const Icon = item?.icon ?? Gauge;
  const [tab, setTab] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  return <section className="module-page">
    <div className="module-title-row"><div><p className="eyebrow">COMMAND MODULE / {String(navItems.findIndex((nav) => nav.label === active) + 1).padStart(2, "0")}</p><h1>{active}</h1><p className="welcome-subtitle">{descriptions[active]}</p></div><button className="primary-button" onClick={onCreateTask}><Plus size={16} /> {active === "Tasks" ? "Create task" : "New draft"}</button></div>
    <div className="module-status"><span className="status-chip"><span className="offline-ring small" /> Prototype module</span><span>Live backend unavailable</span><button className="text-button" onClick={() => setShowInfo(!showInfo)}><CircleHelp size={14} /> What does this mean?</button></div>
    {showInfo && <div className="info-callout"><strong>This screen is an interface scaffold.</strong><p>Records and actions are not yet connected to an authenticated backend. Do not enter real customer, financial, or sensitive data. The next implementation phase adds identity, permissions, persistence and audit events.</p></div>}
    {active === "Projects" ? <div className="panel module-panel"><SectionHeading eyebrow="PORTFOLIO" title="Project register" right={<span className="neutral-tag">Sample records</span>} />{projects.map((project) => <div className="module-record" key={project.name}><span className={`project-symbol ${project.tone}`}><FolderKanban size={17} /></span><div className="record-main"><strong>{project.name}</strong><p>{project.tag} · {project.owner}</p><div className="progress-track"><span className={project.tone} style={{ width: `${project.progress}%` }} /></div></div><span className="status-pill"><StatusDot tone={project.tone} />{project.status}</span></div>)}</div>
    : active === "Tasks" ? <div className="panel module-panel"><SectionHeading eyebrow="DELIVERY" title="Task register" right={<span className="neutral-tag">{localTasks.length} local records</span>} /><div className="module-controls"><label className="table-search"><Search size={15} /><input value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Filter tasks..." /></label><div className="segmented">{["All", "Planned", "In progress"].map((name) => <button className={tab === name ? "selected" : ""} key={name} onClick={() => setTab(name)}>{name}</button>)}</div></div>{localTasks.filter((task) => (tab === "All" || task.state === tab) && task.title.toLowerCase().includes(localSearch.toLowerCase())).map((task) => <div className="task-record" key={task.title}><span className="task-check"><Check size={13} /></span><div className="record-main"><strong>{task.title}</strong><p>{task.project} · {task.owner}</p></div><span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="task-state">{task.state}</span></div>)}</div>
    : active === "Approvals" ? <div className="panel module-panel"><SectionHeading eyebrow="HUMAN CONTROL" title="Approval register" right={<span className="neutral-tag">No actions executable</span>} />{approvals.map((approval) => <div className="module-record" key={approval.title}><span className="approval-symbol"><ShieldCheck size={16} /></span><div className="record-main"><strong>{approval.title}</strong><p>{approval.detail}</p></div><span className="approval-tag">{approval.risk}</span><span className="status-pill">{approval.status}</span></div>)}<div className="approval-footer"><LockKeyhole size={14} /> Approvals are records of intent until a secure executor is implemented.</div></div>
    : <div className="module-cards"><article className="panel module-placeholder"><span className="large-module-icon"><Icon size={23} /></span><p className="eyebrow">MODULE FOUNDATION</p><h2>{active}</h2><p>{descriptions[active]}</p><div className="placeholder-status"><StatusDot tone="amber" /> Awaiting backend implementation</div></article><article className="panel module-checklist"><SectionHeading eyebrow="IMPLEMENTATION CHECKLIST" title="What comes next" /><div className="checklist-row"><span>01</span><div><strong>Define data and access rules</strong><p>Specify record ownership, visibility and permitted actions.</p></div></div><div className="checklist-row"><span>02</span><div><strong>Implement server API</strong><p>Validate inputs and enforce role permissions on every request.</p></div></div><div className="checklist-row"><span>03</span><div><strong>Connect and verify</strong><p>Test failure cases before displaying a connected status.</p></div></div></article></div>}
    <footer className="footer-note"><span>PRUDEN COMMAND <b>·</b> BUILD. LEARN. INVENT. EVOLVE.</span><span><StatusDot tone="amber" /> Prototype only</span></footer>
  </section>;
}
