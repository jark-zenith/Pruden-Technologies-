import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import GitHubProjectsPage from "./GitHubProjectsPage";
import WebsiteInboxPage from "./WebsiteInboxPage";
import IvyAssistant, { IvySettingsPanel } from "./IvyAssistant";
import type { User } from "@supabase/supabase-js";
import { listProjects, createProject, listTasks, createTask, updateTaskStatus, listApprovals } from "./lib/operations";
import { githubProjects } from "./githubProjects";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Bot, BriefcaseBusiness, Mail,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command,
  CreditCard, Database, FileText, FolderKanban, Gauge, GitBranch, LayoutDashboard,
  ListTodo, LockKeyhole, Menu, Plus, Search, Settings2, ShieldCheck,
  Sparkles, Users, X, Zap, Github, Sun, Moon,
  type LucideIcon,
} from "lucide-react";

type ModuleKey =
  | "Overview" | "Projects" | "Tasks" | "Website Inbox" | "AI Workforce" | "Approvals"
  | "Customers & CRM" | "Finance" | "Products & Services" | "Infrastructure"
  | "Security & Audit" | "Knowledge Base" | "Reports & Settings" | "GitHub";

type NavItem = { label: ModuleKey; icon: LucideIcon; group: string; badge?: string };

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Projects", icon: FolderKanban, group: "WORKSPACE" },
  { label: "Tasks", icon: ListTodo, group: "WORKSPACE" },
  { label: "Website Inbox", icon: Mail, group: "WORKSPACE", badge: "NEW" },
  { label: "AI Workforce", icon: Bot, group: "INTELLIGENCE" },
  { label: "Approvals", icon: ShieldCheck, group: "INTELLIGENCE" },
  { label: "Customers & CRM", icon: Users, group: "BUSINESS" },
  { label: "Finance", icon: CreditCard, group: "BUSINESS" },
  { label: "Products & Services", icon: BriefcaseBusiness, group: "BUSINESS" },
  { label: "Infrastructure", icon: Database, group: "SYSTEMS" },
  { label: "Security & Audit", icon: LockKeyhole, group: "SYSTEMS" },
  { label: "Knowledge Base", icon: FileText, group: "SYSTEMS" },
  { label: "Reports & Settings", icon: Settings2, group: "SYSTEMS" },
  { label: "GitHub", icon: Github, group: "SYSTEMS" },
];

type ProjectView = { id: string; name: string; tag: string; progress: number; status: string; tone: string; owner: string; due: string };
type TaskView = { id: string; title: string; project: string; priority: string; owner: string; state: string };
type ApprovalView = { id: string; title: string; detail: string; risk: string; status: string };

const descriptions: Record<ModuleKey, string> = {
  "Overview": "Your operating picture, priorities and decisions in one place.",
  "Projects": "Track outcomes, owners, milestones, budgets and delivery health.",
  "Tasks": "Turn priorities into owned work with acceptance criteria and evidence.",
  "Website Inbox": "Review applications, contact requests and feedback from your live websites.",
  "AI Workforce": "Register agents, scope their capabilities and review their runs.",
  "Approvals": "Review consequential actions before anything is executed.",
  "Customers & CRM": "Manage leads, customer relationships and delivery hand-offs.",
  "Finance": "Monitor verified financial records, budgets and operating costs.",
  "Products & Services": "Maintain the catalogue, product owners and release status.",
  "Infrastructure": "Track repositories, environments, providers and service health.",
  "Security & Audit": "Review access, audit events, risks and incident readiness.",
  "Knowledge Base": "Keep company decisions, playbooks and technical notes searchable.",
  "Reports & Settings": "Configure your workspace, team, notifications and reporting.",
  "GitHub": "Browse repositories, deployment links and live-site previews.",
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


function LiveProjectShowcase() {
  const liveProjects = useMemo(() => githubProjects.filter((project) => project.deploymentUrl && !project.archived), []);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (liveProjects.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % liveProjects.length), 8000);
    return () => window.clearInterval(timer);
  }, [liveProjects.length]);
  if (!liveProjects.length) return <section className="live-showcase empty-live-showcase"><div><p className="eyebrow">LIVE PROJECT SPOTLIGHT</p><h2>Projects will appear here</h2><p>Link deployed project URLs in the repository directory to enable the rotating showcase.</p></div></section>;
  const project = liveProjects[index % liveProjects.length];
  return <section className="live-showcase" aria-label="Rotating live project showcase">
    <div className="live-showcase-copy">
      <p className="eyebrow"><span className="live-indicator" /> LIVE PROJECT SPOTLIGHT</p>
      <h2>{project.name}</h2>
      <p>Explore one of the deployed PRUDEN projects. The featured live view changes automatically every few seconds.</p>
      <div className="live-showcase-meta"><span className="showcase-live-dot" /> Deployment URL configured <span className="showcase-counter">{String(index + 1).padStart(2, "0")} / {String(liveProjects.length).padStart(2, "0")}</span></div>
      <div className="live-showcase-actions"><a className="primary-button" href={project.deploymentUrl!} target="_blank" rel="noreferrer">Open live project <ArrowUpRight size={15} /></a><a className="secondary-button" href={project.repoUrl} target="_blank" rel="noreferrer"><Github size={14} /> Repository</a></div>
      <div className="showcase-dots" role="group" aria-label="Choose featured project">{liveProjects.map((item, itemIndex) => <button key={item.repoUrl} className={itemIndex === index ? "active" : ""} aria-label={"Show " + item.name} onClick={() => setIndex(itemIndex)} />)}</div>
    </div>
    <div className="live-showcase-screen">
      <div className="showcase-browser-bar"><span /><span /><span /><strong>{project.name}</strong><a href={project.deploymentUrl!} target="_blank" rel="noreferrer" aria-label={"Open " + project.name}><ArrowUpRight size={14} /></a></div>
      <iframe key={project.repoUrl} src={project.deploymentUrl!} title={project.name + " live view"} loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" />
      <div className="showcase-screen-caption">Live-site preview · Some websites may block embedded viewing</div>
    </div>
  </section>;
}

export default function App({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [active, setActive] = useState<ModuleKey>("Overview");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = window.localStorage.getItem("pruden-command-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* Use system preference when storage is unavailable. */ }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCreated, setTaskCreated] = useState(false);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [localTasks, setLocalTasks] = useState<TaskView[]>([]);
  const [approvals, setApprovals] = useState<ApprovalView[]>([]);
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let alive = true;
    setBackendLoading(true);
    Promise.all([listProjects(user), listTasks(user), listApprovals(user)])
      .then(([projectRows, taskRows, approvalRows]) => {
        if (!alive) return;
        const projectViews: ProjectView[] = projectRows.map((p) => ({
          id: p.id, name: p.name, tag: "WORKSPACE PROJECT",
          progress: p.status === "completed" || p.status === "archived" ? 100 : p.status === "active" ? 60 : p.status === "blocked" ? 25 : 0,
          status: p.status.replace("_", " "), tone: p.status === "blocked" ? "amber" : p.status === "completed" ? "cyan" : p.status === "active" ? "blue" : "violet",
          owner: "Founder workspace", due: p.due_date || "No due date",
        }));
        const projectNames = new Map(projectRows.map((p) => [p.id, p.name]));
        setProjects(projectViews);
        setLocalTasks(taskRows.map((t) => ({
          id: t.id, title: t.title, project: t.project_id ? (projectNames.get(t.project_id) || "Project") : "PRUDEN Command",
          priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
          owner: t.assigned_to || "Unassigned",
          state: t.status === "completed" ? "Completed" : t.status === "in_progress" ? "In progress" : t.status === "blocked" ? "Blocked" : t.status === "cancelled" ? "Cancelled" : "Planned",
        })));
        setApprovals(approvalRows.map((a) => ({
          id: a.id, title: a.summary, detail: a.action_type.replace(/[._-]/g, " "), risk: a.risk_level,
          status: a.status === "pending" ? "Awaiting decision" : a.status.charAt(0).toUpperCase() + a.status.slice(1),
        })));
        setBackendError("");
      })
      .catch((err) => { if (alive) setBackendError(err instanceof Error ? err.message : "Unable to load Supabase records."); })
      .finally(() => { if (alive) setBackendLoading(false); });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("pruden-command-theme", theme); } catch { /* Theme still works for this session. */ }
  }, [theme]);

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

  const toggleTaskCompletion = async (task: TaskView) => {
    const nextState = task.state === "Completed" ? "planned" : "completed";
    try {
      await updateTaskStatus(user, task.id, nextState);
      setLocalTasks((current) => current.map((item) => item.id === task.id ? { ...item, state: nextState === "completed" ? "Completed" : "Planned" } : item));
      setBackendError("");
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "Task status could not be updated.");
    }
  };

  const createDraftTask = async () => {
    const title = taskTitle.trim();
    if (!title) return;
    setBackendError("");
    try {
      if (active === "Projects") {
        const created = await createProject(user, { name: title, description: "", status: "planned", priority: "medium", due_date: null });
        setProjects((current) => [{ id: created.id, name: created.name, tag: "WORKSPACE PROJECT", progress: 0, status: created.status, tone: "violet", owner: "Founder workspace", due: created.due_date || "No due date" }, ...current]);
      } else {
        const created = await createTask(user, { title, description: "", project_id: null, status: "planned", priority: "medium", assigned_to: "Founder", due_date: null });
        setLocalTasks((current) => [{ id: created.id, title: created.title, project: "PRUDEN Command", priority: "Medium", owner: created.assigned_to || "Founder", state: "Planned" }, ...current]);
      }
      setTaskTitle("");
      setTaskCreated(true);
      setShowQuickAdd(false);
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "The record could not be saved.");
    }
  };

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <BrandMark />
          {!collapsed && <div className="brand-copy"><strong>PRUDEN<span>TECHNOLOGIES</span></strong><small>COMMAND CENTRE</small></div>}
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
          <div className="system-status"><span className="pulse" />{!collapsed && <><span>{backendLoading ? "Connecting…" : backendError ? "Connection issue" : "Supabase connected"}</span><span className="status-caption">{backendError ? "Check backend status" : "Authenticated workspace"}</span></>}</div>
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
            <button className="icon-button theme-toggle" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button className={`icon-button notification-button ${showNotifications ? "selected" : ""}`} aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}><Bell size={17} /><i /></button>
            <button className="top-avatar" title="Sign out" aria-label="Sign out" onClick={onSignOut}>PJ</button>
          </div>
        </header>

        {showNotifications && <div className="notification-popover"><div className="popover-head"><strong>Notifications</strong><button className="text-button" onClick={() => setShowNotifications(false)}>Close</button></div><div className="notice-item"><span className="notice-icon"><ShieldCheck size={16} /></span><div><strong>Security setup pending</strong><p>Configure team roles before connecting real data.</p><small>Setup reminder · Prototype</small></div></div><div className="notice-item"><span className="notice-icon"><GitBranch size={16} /></span><div><strong>Agent gateway not connected</strong><p>No provider actions are available in this prototype.</p><small>System status</small></div></div></div>}

        <div className="content-wrap">
          <div className="prototype-banner"><span><Activity size={14} /> {backendLoading ? "CONNECTING" : backendError ? "BACKEND ISSUE" : "LIVE DATA"}</span><p>{backendError || (backendLoading ? "Loading your workspace from Supabase…" : "Authenticated workspace · Records protected by Supabase Row Level Security")}</p><button onClick={() => chooseModule("Infrastructure")}>View system status <ArrowRight size={13} /></button></div>

          {active === "GitHub" ? <GitHubProjectsPage /> : active === "Website Inbox" ? <WebsiteInboxPage user={user} /> : active === "Overview" ? (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow"><span className="live-indicator" /> TECHNOLOGY OPERATIONS / 01</p><h1>Welcome back, <em>Founder.</em></h1><p className="welcome-subtitle">Here’s your current operating picture. Build with clarity, move with intent.</p></div>
                <button className="primary-button" onClick={() => { setTaskCreated(false); setShowQuickAdd(true); }}><Plus size={16} /> Create task</button>
              </section>

              <LiveProjectShowcase />

              <section className="metric-grid" aria-label="Workspace overview metrics">
                <article className="metric-card"><div className="metric-top"><span>Active projects</span><span className="metric-icon blue"><FolderKanban size={17} /></span></div><div className="metric-value">{String(projects.filter((p) => p.status === "active").length).padStart(2, "0")} <small>live</small></div><div className="metric-foot"><span className="metric-note"><Activity size={13} /> Supabase records</span><span className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="metric-card"><div className="metric-top"><span>Open tasks</span><span className="metric-icon cyan"><ListTodo size={17} /></span></div><div className="metric-value">{String(localTasks.filter((t) => !["Completed", "Cancelled"].includes(t.state)).length).padStart(2, "0")} <small>live</small></div><div className="metric-foot"><span className="metric-note">Persisted task records</span><span className="mini-bars cyan-bars"><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="metric-card"><div className="metric-top"><span>Pending approvals</span><span className="metric-icon amber"><ShieldCheck size={17} /></span></div><div className="metric-value">{String(approvals.filter((a) => a.status === "Awaiting decision").length).padStart(2, "0")} <small>live</small></div><div className="metric-foot"><span className="metric-note">Human review required</span><span className="mini-bars amber-bars"><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="metric-card"><div className="metric-top"><span>Agent gateway</span><span className="metric-icon violet"><Bot size={17} /></span></div><div className="metric-value gateway-value"><span className="offline-ring" /> Offline</div><div className="metric-foot"><span className="metric-note">No provider connected</span><span className="metric-link" onClick={() => chooseModule("AI Workforce")}>Configure <ArrowUpRight size={13} /></span></div></article>
              </section>

              <section className="main-grid">
                <div className="panel projects-panel">
                  <SectionHeading eyebrow="PORTFOLIO" title="Project pulse" right={<button className="text-button" onClick={() => chooseModule("Projects")}>All projects <ArrowRight size={13} /></button>} />
                  <div className="project-list">{projects.length === 0 ? <p className="empty-nav">No projects yet. Create the first project to begin tracking delivery.</p> : projects.map((project) => <button className="project-row" key={project.name} onClick={() => chooseModule("Projects")}><div className={`project-symbol ${project.tone}`}>{project.name === "PRUDEN Command" ? <Command size={18} /> : project.name === "PichaHub" ? <Sparkles size={18} /> : <Zap size={18} />}</div><div className="project-main"><div className="project-name-row"><strong>{project.name}</strong><span className={`status-pill ${project.tone}`}><StatusDot tone={project.tone} />{project.status}</span></div><p>{project.tag} <span>·</span> {project.owner}</p><div className="progress-track"><span className={project.tone} style={{ width: `${project.progress}%` }} /></div></div><div className="project-progress"><strong>{project.progress}%</strong><small>{project.due}</small></div></button>)}</div>
                </div>
                <div className="panel priority-panel">
                  <SectionHeading eyebrow="FOCUS QUEUE" title="Next priorities" right={<span className="count-badge">04</span>} />
                  <div className="priority-list">{localTasks.length === 0 ? <p className="empty-nav">No tasks yet. Add a task to create your first action item.</p> : localTasks.slice(0, 4).map((task, index) => <button className="priority-row" key={task.title} onClick={() => chooseModule("Tasks")}><span className={`priority-index ${task.priority.toLowerCase()}`}>{String(index + 1).padStart(2, "0")}</span><span className="priority-copy"><strong>{task.title}</strong><small>{task.project} · {task.owner}</small></span><ArrowUpRight size={14} /></button>)}</div>
                  <button className="panel-bottom-link" onClick={() => chooseModule("Tasks")}>Open task board <ArrowRight size={14} /></button>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel approvals-panel"><SectionHeading eyebrow="CONTROL LAYER" title="Approval queue" right={<button className="text-button" onClick={() => chooseModule("Approvals")}>Review all <ArrowRight size={13} /></button>} /><div className="approval-list">{approvals.length === 0 ? <p className="empty-nav">No approval requests are waiting in your workspace.</p> : approvals.map((approval) => <div className="approval-row" key={approval.title}><span className="approval-symbol"><LockKeyhole size={15} /></span><div className="approval-copy"><strong>{approval.title}</strong><p>{approval.detail}</p></div><span className="approval-tag">{approval.risk}</span></div>)}</div><div className="approval-footer"><ShieldCheck size={14} /><span>Consequential actions stay human-approved.</span></div></div>
                <div className="panel system-panel"><SectionHeading eyebrow="SYSTEM HEALTH" title="Connected services" right={<span className="neutral-tag">{backendError ? "Connection issue" : backendLoading ? "Connecting…" : "1 connected"}</span>} /><div className="service-list"><div className="service-row"><span className="service-icon"><GitBranch size={16} /></span><span><strong>GitHub</strong><small>Repository metadata</small></span><span className="service-state"><i /> Repository view</span></div><div className="service-row"><span className="service-icon"><Database size={16} /></span><span><strong>Supabase</strong><small>Auth + PostgreSQL</small></span><span className="service-state"><i /> {backendError ? "Needs attention" : backendLoading ? "Connecting" : "Connected"}</span></div><div className="service-row"><span className="service-icon"><Bot size={16} /></span><span><strong>Agent gateway</strong><small>Provider-neutral API</small></span><span className="service-state"><i /> Not connected</span></div></div><button className="panel-bottom-link" onClick={() => chooseModule("Infrastructure")}>Integration settings <ArrowRight size={14} /></button></div>
              </section>
              <section className="service-catalog">
                <div className="catalog-heading"><div><p className="eyebrow">CAPABILITIES</p><h2>Pruden Technologies services</h2><p>Our current service catalogue, with future capabilities clearly marked.</p></div><button className="text-button" onClick={() => chooseModule("Products & Services")}>Manage catalogue <ArrowRight size={13} /></button></div>
                <div className="catalog-grid">
                  <article className="catalog-card"><span>⌘</span><h3>Web & App Development</h3><p>Custom websites, web applications, dashboards and client portals.</p><small>CORE SERVICE</small></article>
                  <article className="catalog-card"><span>▣</span><h3>Portfolio Development</h3><p>Professional portfolios that showcase skills, projects and brands.</p><small>CORE SERVICE</small></article>
                  <article className="catalog-card"><span>✦</span><h3>AI Solutions & Automation</h3><p>Practical AI assistants, knowledge tools and workflow automation.</p><small>PROTOTYPE / BY SCOPE</small></article>
                  <article className="catalog-card"><span>◈</span><h3>Creative Studio</h3><p>Photo and video editing, brand assets and content production.</p><small>CORE SERVICE</small></article>
                  <article className="catalog-card"><span>✎</span><h3>Script & Content Writing</h3><p>Scripts and creative copy for videos, ads and digital content.</p><small>CORE SERVICE</small></article>
                  <article className="catalog-card"><span>⌘</span><h3>Coding Education</h3><p>Practical coding guidance built around projects and learning goals.</p><small>CORE SERVICE</small></article>
                </div>
              </section>
              <footer className="footer-note"><span>PRUDEN COMMAND <b>·</b> BUILD. LEARN. INVENT. EVOLVE.</span><span><StatusDot tone={backendError ? "amber" : "cyan"} /> {backendError ? "Backend needs attention" : "Authenticated live workspace"}</span></footer>
            </>
          ) : (
            <ModulePage active={active} onCreateTask={() => { setTaskCreated(false); setShowQuickAdd(true); }} localTasks={localTasks} projects={projects} approvals={approvals} onToggleTask={toggleTaskCompletion} />
          )}
        </div>
      </main>

      {showQuickAdd && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowQuickAdd(false); }}><section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-head"><div><p className="eyebrow">WORKSPACE / TASKS</p><h2 id="task-modal-title">{active === "Projects" ? "Create a project" : "Create a task"}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setShowQuickAdd(false)}><X size={17} /></button></div><p className="modal-description">This record will be saved to your authenticated Supabase workspace.</p><label className="field-label" htmlFor="task-title">{active === "Projects" ? "Project name" : "Task title"}</label><input id="task-title" className="task-input" autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createDraftTask(); }} placeholder={active === "Projects" ? "e.g. PichaHub creator dashboard" : "e.g. Define team permission matrix"} /><div className="modal-foot"><button className="secondary-button" onClick={() => setShowQuickAdd(false)}>Cancel</button><button className="primary-button" onClick={createDraftTask} disabled={!taskTitle.trim()}><Plus size={15} /> Save to workspace</button></div></section></div>}
      <IvyAssistant activeModule={active} onNavigate={(module) => { if (navItems.some((item) => item.label === module)) chooseModule(module as ModuleKey); }} workspace={{ projects: projects.map((project) => ({ name: project.name, status: project.status })), tasks: localTasks.map((task) => ({ title: task.title, state: task.state, priority: task.priority })), approvals: approvals.map((approval) => ({ title: approval.title, status: approval.status })), backendStatus: backendError ? "error" : backendLoading ? "loading" : "connected" }} />
      {taskCreated && <div className="toast"><Check size={16} /><span>Record saved to your Supabase workspace.</span><button aria-label="Dismiss notification" onClick={() => setTaskCreated(false)}><X size={14} /></button></div>}
    </div>
  );
}

function ModulePage({ active, onCreateTask, localTasks, projects, approvals, onToggleTask }: { active: ModuleKey; onCreateTask: () => void; localTasks: TaskView[]; projects: ProjectView[]; approvals: ApprovalView[]; onToggleTask: (task: TaskView) => void }) {
  const item = navItems.find((nav) => nav.label === active);
  const Icon = item?.icon ?? Gauge;
  const [tab, setTab] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  return <section className="module-page">
    <div className="module-title-row"><div><p className="eyebrow">COMMAND MODULE / {String(navItems.findIndex((nav) => nav.label === active) + 1).padStart(2, "0")}</p><h1>{active}</h1><p className="welcome-subtitle">{descriptions[active]}</p></div>{(active === "Projects" || active === "Tasks") && <button className="primary-button" onClick={onCreateTask}><Plus size={16} /> {active === "Projects" ? "New project" : "Create task"}</button>}</div>
    <div className="module-status"><span className="status-chip"><span className="offline-ring small" /> Authenticated module</span><span>Supabase data</span><button className="text-button" onClick={() => setShowInfo(!showInfo)}><CircleHelp size={14} /> What does this mean?</button></div>
    {showInfo && <div className="info-callout"><strong>Authenticated workspace.</strong><p>Records are loaded from Supabase and protected by Row Level Security. Only the currently signed-in account can access its own records.</p></div>}
    {active === "Projects" ? <div className="panel module-panel"><SectionHeading eyebrow="PORTFOLIO" title="Project register" right={<span className="neutral-tag">Supabase records</span>} />{projects.map((project) => <div className="module-record" key={project.id}><span className={`project-symbol ${project.tone}`}><FolderKanban size={17} /></span><div className="record-main"><strong>{project.name}</strong><p>{project.tag} · {project.owner}</p><div className="progress-track"><span className={project.tone} style={{ width: `${project.progress}%` }} /></div></div><span className="status-pill"><StatusDot tone={project.tone} />{project.status}</span></div>)}</div>
    : active === "Tasks" ? <div className="panel module-panel"><SectionHeading eyebrow="DELIVERY" title="Task register" right={<span className="neutral-tag">{localTasks.length} saved records</span>} /><div className="module-controls"><label className="table-search"><Search size={15} /><input value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Filter tasks..." /></label><div className="segmented">{["All", "Planned", "In progress"].map((name) => <button className={tab === name ? "selected" : ""} key={name} onClick={() => setTab(name)}>{name}</button>)}</div></div>{localTasks.filter((task) => (tab === "All" || task.state === tab) && task.title.toLowerCase().includes(localSearch.toLowerCase())).map((task) => <div className="task-record" key={task.title}><span className="task-check"><Check size={13} /></span><div className="record-main"><strong>{task.title}</strong><p>{task.project} · {task.owner}</p></div><span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="task-state">{task.state}</span><button className="text-button" onClick={() => onToggleTask(task)}>{task.state === "Completed" ? "Reopen" : "Complete"}</button></div>)}</div>
    : active === "Approvals" ? <div className="panel module-panel"><SectionHeading eyebrow="HUMAN CONTROL" title="Approval register" right={<span className="neutral-tag">Human approval required</span>} />{approvals.map((approval) => <div className="module-record" key={approval.id}><span className="approval-symbol"><ShieldCheck size={16} /></span><div className="record-main"><strong>{approval.title}</strong><p>{approval.detail}</p></div><span className="approval-tag">{approval.risk}</span><span className="status-pill">{approval.status}</span></div>)}<div className="approval-footer"><LockKeyhole size={14} /> Approvals are records of intent until a secure executor is implemented.</div></div>
    : <div className="module-cards"><article className="panel module-placeholder"><span className="large-module-icon"><Icon size={23} /></span><p className="eyebrow">MODULE FOUNDATION</p><h2>{active}</h2><p>{descriptions[active]}</p><div className="placeholder-status"><StatusDot tone="amber" /> Awaiting backend implementation</div></article><article className="panel module-checklist"><SectionHeading eyebrow="IMPLEMENTATION CHECKLIST" title="What comes next" /><div className="checklist-row"><span>01</span><div><strong>Define data and access rules</strong><p>Specify record ownership, visibility and permitted actions.</p></div></div><div className="checklist-row"><span>02</span><div><strong>Implement server API</strong><p>Validate inputs and enforce role permissions on every request.</p></div></div><div className="checklist-row"><span>03</span><div><strong>Connect and verify</strong><p>Test failure cases before displaying a connected status.</p></div></div></article></div>}
    <footer className="footer-note"><span>PRUDEN COMMAND <b>·</b> BUILD. LEARN. INVENT. EVOLVE.</span><span><StatusDot tone="cyan" /> Supabase workspace</span></footer>
  </section>;
}
