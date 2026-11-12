import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import { createWorkforceTask, setWorkforceTaskStatus, recordTaskAgentRun } from "./lib/operations";
import "./headquarters.css";

type Task = { id: string; title: string; project: string; priority: string; owner: string; state: string };
type Project = { id: string; name: string; status: string; progress: number; due: string };
type Approval = { id: string; title: string; detail: string; risk: string; status: string };
type LiveTask = { id: string; title: string; description?: string; status: string; priority?: string; assigned_to?: string; project_id?: string | null; due_date?: string | null; created_at?: string; updated_at?: string };
type LiveApproval = { id: string; action_type: string; target_type: string; target_id?: string | null; summary: string; risk_level: string; status: string; requested_by: string; reviewed_at?: string | null; created_at: string };
type AuditEvent = { id: string; action: string; entity_type: string; entity_id?: string | null; outcome?: string; details?: Record<string, unknown>; created_at: string };
type RuntimeAgent = { id: string; state: string; currentTask?: string | null; runId?: string | null; startedAt?: string | null; lastTask?: string | null; lastOutcome?: string | null; lastActivityAt?: string | null; runCount?: number };
type RuntimeEvent = { id: string; type: string; agentId: string; agentName: string; taskSummary?: string; outcome?: string | null; occurredAt: string };
type RuntimeSnapshot = { agents: RuntimeAgent[]; events: RuntimeEvent[]; updatedAt: string; persistence?: string };
type FinanceRecord = { id: string; kind: "income" | "expense"; amount: number; currency: string; occurred_on: string; category: string };
type SavingsGoal = { id: string; name: string; target_amount: number; mpesa_amount: number; cash_amount: number; status: string };
type Registry = { ivy?: Record<string, unknown>; departments?: Array<{ name: string; agents: Array<Record<string, unknown>> }> };
type SystemSnapshot = { health: Record<string, unknown> | null; ivy: Record<string, unknown> | null; capabilities: Record<string, unknown> | null };
type FinanceSnapshot = { state: "loading" | "ready" | "error" | "unavailable"; records: FinanceRecord[]; goals: SavingsGoal[] };

const emptyRuntime: RuntimeSnapshot = { agents: [], events: [], updatedAt: new Date().toISOString(), persistence: "process-memory" };
const fallbackTasks = (tasks: Task[]): LiveTask[] => tasks.map((task) => ({
  id: task.id, title: task.title, status: task.state === "In progress" ? "in_progress" : task.state === "Awaiting verification" ? "awaiting_verification" : task.state === "Completed" ? "completed" : task.state === "Blocked" ? "blocked" : task.state === "Cancelled" ? "cancelled" : "planned",
  priority: task.priority.toLowerCase(), assigned_to: task.owner, description: task.project
}));
const fallbackApprovals = (approvals: Approval[]): LiveApproval[] => approvals.map((approval) => ({
  id: approval.id, action_type: approval.detail, target_type: "workspace", summary: approval.title,
  risk_level: approval.risk, status: approval.status === "Awaiting decision" ? "pending" : approval.status.toLowerCase(), requested_by: "Founder", created_at: new Date().toISOString()
}));

export default function HeadquartersPage({ user, tasks, projects = [], approvals = [], onExit, onNavigate }: {
  user: User; tasks: Task[]; projects?: Project[]; approvals?: Approval[]; onExit: () => void; onNavigate?: (module: string) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const [frameReady, setFrameReady] = useState(false);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [system, setSystem] = useState<SystemSnapshot>({ health: null, ivy: null, capabilities: null });
  const [runtime, setRuntime] = useState<RuntimeSnapshot>(emptyRuntime);
  const [runtimeConnection, setRuntimeConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const [databaseConnection, setDatabaseConnection] = useState<"connecting" | "live" | "offline" | "unavailable">("connecting");
  const [databaseSnapshotLoaded, setDatabaseSnapshotLoaded] = useState(false);
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>(() => fallbackTasks(tasks));
  const [liveApprovals, setLiveApprovals] = useState<LiveApproval[]>(() => fallbackApprovals(approvals));
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [finance, setFinance] = useState<FinanceSnapshot>({ state: "loading", records: [], goals: [] });
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());

  useEffect(() => {
    if (!databaseSnapshotLoaded) {
      setLiveTasks(fallbackTasks(tasks));
      setLiveApprovals(fallbackApprovals(approvals));
    }
  }, [tasks, approvals, databaseSnapshotLoaded]);

  useEffect(() => {
    let alive = true;
    const readJson = async (url: string) => {
      const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(url + " returned " + response.status);
      return response.json();
    };
    void Promise.allSettled([
      readJson("/api/workforce/agents"), readJson("/health"), readJson("/api/ivy/status"), readJson("/api/ivy/capabilities"), readJson("/api/workforce/runtime")
    ]).then((results) => {
      if (!alive) return;
      if (results[0].status === "fulfilled") setRegistry(results[0].value as Registry);
      if (results[1].status === "fulfilled" || results[2].status === "fulfilled" || results[3].status === "fulfilled") {
        setSystem({ health: results[1].status === "fulfilled" ? results[1].value : null, ivy: results[2].status === "fulfilled" ? results[2].value : null, capabilities: results[3].status === "fulfilled" ? results[3].value : null });
      }
      if (results[4].status === "fulfilled") { setRuntime(results[4].value as RuntimeSnapshot); setRuntimeConnection("live"); }
      setLastUpdated(new Date().toISOString());
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    let fallbackTimer: number | undefined;
    const fetchRuntime = async () => {
      try {
        const response = await fetch("/api/workforce/runtime", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("Runtime snapshot unavailable");
        const data = await response.json() as RuntimeSnapshot;
        if (alive) { setRuntime(data); setRuntimeConnection("live"); }
      } catch { if (alive) setRuntimeConnection("offline"); }
    };
    const stream = typeof EventSource !== "undefined" ? new EventSource("/api/workforce/stream") : null;
    if (stream) {
      stream.onmessage = (event) => {
        try { const data = JSON.parse(event.data) as RuntimeSnapshot; if (alive) { setRuntime(data); setRuntimeConnection("live"); if (fallbackTimer !== undefined) { window.clearInterval(fallbackTimer); fallbackTimer = undefined; } } } catch { /* Ignore malformed stream frames. */ }
      };
      stream.onerror = () => {
        if (!alive) return;
        setRuntimeConnection("offline");
        if (fallbackTimer === undefined) fallbackTimer = window.setInterval(() => { void fetchRuntime(); }, 5000);
      };
    } else {
      void fetchRuntime();
      fallbackTimer = window.setInterval(() => { void fetchRuntime(); }, 5000);
    }
    return () => { alive = false; stream?.close(); if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer); };
  }, []);

  const refreshDatabase = useCallback(async () => {
    if (!supabase) { setDatabaseConnection("unavailable"); setFinance({ state: "unavailable", records: [], goals: [] }); return; }
    const [taskRows, approvalRows, auditRows, ledgerRows, goalRows] = await Promise.all([
      supabase.from("pruden_tasks").select("id,title,description,status,priority,assigned_to,project_id,due_date,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      supabase.from("pruden_approvals").select("id,action_type,target_type,target_id,summary,risk_level,status,requested_by,reviewed_at,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("pruden_audit_events").select("id,action,entity_type,entity_id,outcome,details,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("pruden_financial_records").select("id,kind,amount,currency,occurred_on,category").order("occurred_on", { ascending: false }).limit(200),
      supabase.from("pruden_savings_goals").select("id,name,target_amount,mpesa_amount,cash_amount,status").order("updated_at", { ascending: false })
    ]);
    if (taskRows.error || approvalRows.error) {
      setDatabaseConnection("offline");
    } else {
      setLiveTasks((taskRows.data || []) as LiveTask[]);
      setLiveApprovals((approvalRows.data || []) as LiveApproval[]);
      setDatabaseSnapshotLoaded(true);
      setDatabaseConnection("live");
    }
    setAudit(auditRows.error ? [] : (auditRows.data || []) as AuditEvent[]);
    setFinance(ledgerRows.error || goalRows.error ? { state: "error", records: [], goals: [] } : { state: "ready", records: (ledgerRows.data || []) as FinanceRecord[], goals: (goalRows.data || []) as SavingsGoal[] });
    setLastUpdated(new Date().toISOString());
  }, []);

  useEffect(() => {
    let alive = true;
    let busy = false;
    const refresh = async () => {
      if (busy || !alive) return;
      busy = true;
      try { await refreshDatabase(); } catch { if (alive) setDatabaseConnection("offline"); }
      finally { busy = false; }
    };
    refreshRef.current = refresh;
    void refresh();
    const client = supabase;
    if (!client) return () => { alive = false; };
    const channel = client.channel("ptms-hq-live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "pruden_tasks" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "pruden_approvals" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "pruden_audit_events" }, () => { void refresh(); })
      .subscribe((status) => { if (alive && status === "SUBSCRIBED") setDatabaseConnection("live"); if (alive && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) setDatabaseConnection("offline"); });
    const fallback = window.setInterval(() => { void refresh(); }, 20000);
    return () => { alive = false; window.clearInterval(fallback); void client.removeChannel(channel); };
  }, [refreshDatabase]);

  const sendToFrame = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    frameRef.current?.contentWindow?.postMessage({ type, ...payload }, "*");
  }, []);

  useEffect(() => {
    if (!frameReady || !frameRef.current?.contentWindow) return;
    sendToFrame("PTMS_LIVE_SNAPSHOT", {
      payload: {
        registry: registry || {}, tasks: liveTasks, approvals: liveApprovals, audit, runtime, system,
        finance, projects, connectionState: runtimeConnection === "live" && databaseConnection === "live" ? "live" : "offline", updatedAt: runtime.updatedAt || lastUpdated
      }
    });
  }, [frameReady, registry, liveTasks, liveApprovals, audit, runtime, system, finance, projects, runtimeConnection, databaseConnection, lastUpdated, sendToFrame]);

  const runAgent = useCallback(async (agentId: string, task: string) => {
    sendToFrame("PTMS_AGENT_BUSY");
    let taskId: string | null = null;
    let runId: string | null = null;
    let toolCalls = 0;
    let auditWarning = false;
    try {
      const request = task.trim();
      if (!request) throw new Error("Enter a task before starting an agent run.");
      const created = await createWorkforceTask(user, { title: request.replace(/\s+/g, " ").slice(0, 200), description: request, project_id: null, status: "planned", priority: "medium", assigned_to: agentId, due_date: null });
      taskId = created.task.id;
      auditWarning ||= !created.auditRecorded;
      const started = await setWorkforceTaskStatus(user, taskId, "in_progress");
      auditWarning ||= !started.auditRecorded;
      const response = await fetch("/api/workforce/run", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId, task: request }) });
      const data = await response.json().catch(() => ({})) as { status?: string; completionKind?: string; missionStatus?: string; verificationStatus?: string; output?: string; error?: string; runId?: string; toolCalls?: number };
      runId = data.runId || null;
      toolCalls = Number.isFinite(data.toolCalls) ? Number(data.toolCalls) : 0;
      if (!response.ok) throw new Error(data.error || "The agent run did not complete.");
      if (data.status !== "response_ready" || data.completionKind !== "agent_response_only" || data.missionStatus !== "not_created" || data.verificationStatus !== "not_performed" || !runId) {
        throw new Error("The agent response was not explicitly marked as unverified. The task is blocked for review.");
      }
      const output = data.output || "The agent returned no text output.";
      const awaitingVerification = await setWorkforceTaskStatus(user, taskId, "awaiting_verification");
      auditWarning ||= !awaitingVerification.auditRecorded;
      auditWarning ||= !(await recordTaskAgentRun(user, taskId, agentId, runId, "awaiting_verification", toolCalls, output));
      sendToFrame("PTMS_AGENT_RESULT", { success: true, output: output + `\n\nRun ${runId} · response ready · awaiting independent verification · ${toolCalls} external tool calls · ${toolCalls > 0 ? "tool-assisted" : "text-only (no external tools were executed)"}.${auditWarning ? "\nAudit note: one or more activity audit writes could not be saved; the task status itself is saved." : ""}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Agent request failed.";
      if (taskId) {
        await setWorkforceTaskStatus(user, taskId, "blocked").catch(() => undefined);
        await recordTaskAgentRun(user, taskId, agentId, runId, "failed", toolCalls, message);
      }
      sendToFrame("PTMS_AGENT_RESULT", { success: false, output: message + (taskId ? `\nTask ${taskId} is saved as blocked for review.` : "") });
    } finally {
      void refreshRef.current();
    }
  }, [sendToFrame, user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; module?: string; agentId?: string; task?: string };
      if (data?.type === "PTMS_EXIT") onExit();
      const allowedModules = new Set(["Overview", "Projects", "Tasks", "Website Inbox", "AI Workforce", "Approvals", "Finance", "Infrastructure", "Security & Audit", "Daily Journal", "Pruden Studios"]);
      if (data?.type === "PTMS_NAVIGATE" && typeof data.module === "string" && allowedModules.has(data.module)) onNavigate?.(data.module);
      if (data?.type === "PTMS_REFRESH") { void refreshRef.current(); }
      if (data?.type === "PTMS_RUN_AGENT" && typeof data.agentId === "string" && typeof data.task === "string") void runAgent(data.agentId, data.task);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onExit, onNavigate, runAgent]);

  return <section className="virtual-hq hq-live-shell" aria-label="Pruden Technologies live AI headquarters" style={{ width: "100%", height: "100dvh", minHeight: "100vh", overflow: "hidden" }}>
    <iframe ref={frameRef} src="/hq-simulation/index.html" title="PRUDEN HQ live AI workforce 2D and 3D floor" sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setFrameReady(true)} style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
  </section>;
}
