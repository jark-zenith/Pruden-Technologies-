import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Activity, Bot, CircleAlert, LoaderCircle, MessageCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import "./workforce.css";
import AIWorkforceGroupChat from "./AIWorkforceGroupChat";

type Agent = {
  id: string; name: string; title: string; reportsTo?: string; responsibilities?: string[];
  allowedActions?: string[]; restrictedActions?: string[]; department?: string;
  presentationGender?: string; personality?: string; orbColor?: string;
};
type Department = { id: string; name: string; lead: string; independent?: boolean; agents: Agent[] };
type Registry = { ivy: Agent; departments: Department[]; controls?: { autonomy?: string; toolsEnabled?: boolean; externalActionsEnabled?: boolean } };
type WorkforceStatus = { configured: boolean; provider: string; model: string; agentCount: number; toolsEnabled: boolean; safeExternalToolsEnabled?: boolean; externalActionsEnabled: boolean; github?: { status: string; approvedRepositories?: string[] }; writeActions?: string; modelProviders?: { gemini?: { configured: boolean; model: string; supportsWorkforceTools: boolean; mode: string }; anthropic?: { configured: boolean; model: string; supportsWorkforceTools: boolean } } };
type ChatMessage = { role: "user" | "assistant"; content: string };

const defaultColor = "#66aaff";

export default function AIWorkforcePage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [status, setStatus] = useState<WorkforceStatus | null>(null);
  const [selected, setSelected] = useState("ivy");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [running, setRunning] = useState(false);
  const [geminiTest, setGeminiTest] = useState<{ state: "idle" | "testing" | "success" | "failed"; message: string }>({ state: "idle", message: "" });

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

  async function testGeminiProvider() {
    setGeminiTest({ state: "testing", message: "Sending a small live test request to Gemini…" });
    try {
      const response = await fetch("/api/workforce/provider-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Gemini test did not pass.");
      setGeminiTest({ state: "success", message: "Live Gemini request succeeded · " + data.model + " · " + data.latencyMs + " ms" });
    } catch (e) {
      setGeminiTest({ state: "failed", message: e instanceof Error ? e.message : "Gemini test failed." });
    }
  }

  const agents = useMemo(() => registry ? [
    { ...registry.ivy, department: "Executive Office" },
    ...registry.departments.flatMap((department) => department.agents.map((agent) => ({ ...agent, department: department.name })))
  ] : [], [registry]);
  const selectedAgent = agents.find((agent) => agent.id === selected) || agents[0];

  function openAgent(agent: Agent) {
    setSelected(agent.id);
    setChatHistory([]);
    setChatInput("");
    setError("");
    setChatOpen(true);
  }

  async function sendMessage() {
    const message = chatInput.trim();
    if (!selectedAgent || !message || running) return;
    const nextHistory: ChatMessage[] = [...chatHistory, { role: "user", content: message }];
    setChatHistory(nextHistory);
    setChatInput("");
    setRunning(true);
    setError("");
    try {
      const conversation = nextHistory.map((item) => (item.role === "user" ? "FOUNDER" : selectedAgent.name.toUpperCase()) + ": " + item.content).join("\n\n");
      const response = await fetch("/api/workforce/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent.id, task: "Continue this text conversation in your assigned role. Follow your registered personality, responsibilities, and restrictions. Previous conversation:\n\n" + conversation })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Agent request failed.");
      setChatHistory((current) => [...current, { role: "assistant", content: String(data.output || "No text response was returned.") }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Agent request failed.");
    } finally { setRunning(false); }
  }

  return <section className="module-page workforce-page">
    <div className="module-title-row">
      <div><p className="eyebrow">INTELLIGENCE / WORKFORCE</p><h1>AI Workforce</h1><p className="welcome-subtitle">Your AI departments, under Founder authority.</p></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span className={status?.configured ? "workforce-status online" : "workforce-status offline"}><span />{status?.modelProviders?.gemini?.configured ? "Gemini key configured" : status?.configured ? "Anthropic configured" : "No model key configured"}</span><button className="secondary-button" onClick={() => void testGeminiProvider()} disabled={geminiTest.state === "testing"}><Sparkles size={14} />{geminiTest.state === "testing" ? "Testing Gemini…" : "Test Gemini"}</button></div>
    </div>
    <div className="workforce-notice"><ShieldCheck size={17} /><div><strong>Safe tool access · write actions still gated</strong><p>Tool-enabled agent runs continue to use the provider that supports their tools. Gemini is currently text-only; tool-enabled tasks stay on Anthropic until Gemini tool calling is implemented and tested.</p></div></div>
    {geminiTest.state !== "idle" && <div role={geminiTest.state === "failed" ? "alert" : "status"} style={{ margin: "0 0 14px", padding: 12, borderRadius: 10, border: "1px solid " + (geminiTest.state === "success" ? "#10b98155" : geminiTest.state === "failed" ? "#ef444455" : "var(--border, #2b3a50)"), color: geminiTest.state === "success" ? "#34d399" : geminiTest.state === "failed" ? "#f87171" : "inherit", fontSize: 12 }}>{geminiTest.message}</div>}
    <div className="workforce-metrics">
      <article className="metric-card"><div className="metric-top"><span>AI identities</span><span className="metric-icon violet"><Bot size={17} /></span></div><div className="metric-value">{status?.agentCount ?? (registry ? agents.length : "—")} <small>registered</small></div></article>
      <article className="metric-card"><div className="metric-top"><span>Departments</span><span className="metric-icon blue"><Activity size={17} /></span></div><div className="metric-value">{registry?.departments.length ?? "—"} <small>operational groups</small></div></article>
      <article className="metric-card"><div className="metric-top"><span>GitHub tools</span><span className="metric-icon amber"><ShieldCheck size={17} /></span></div><div className="metric-value">{status?.toolsEnabled ? "Available" : "Needs setup"} <small>{status?.toolsEnabled ? "read-only" : "GITHUB_TOKEN"}</small></div></article>
    </div>
    {error && !chatOpen && <div className="workforce-error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
    {loadingRegistry ? <div className="panel workforce-loading"><LoaderCircle size={18} /> Loading AI workforce registry…</div> : registry ? <>
      <div className="workforce-layout">
        <div className="panel workforce-roster">
          <div className="workforce-panel-heading"><div><p className="eyebrow">REPORTING STRUCTURE</p><h2>Departments & agents</h2></div><span className="neutral-tag">{agents.length} identities</span></div>
          <button className={selected === "ivy" ? "workforce-agent selected" : "workforce-agent"} onClick={() => openAgent(agents[0])}>
            <span className="workforce-avatar ivy" style={{ "--orb-color": agents[0]?.orbColor || defaultColor } as CSSProperties}>I</span><span className="workforce-agent-copy"><strong>Ivy</strong><small>AI Chief of Staff · Reports to Founder</small></span><span className="workforce-role-tag">EXECUTIVE</span>
          </button>
          {registry.departments.map((department) => <div className="workforce-department" key={department.id}>
            <div className="workforce-department-heading"><div><strong>{department.name}</strong><small>{department.agents.length} specialist{department.agents.length === 1 ? "" : "s"}{department.independent ? " · Independent QA" : ""}</small></div><span>LEAD: {department.lead}</span></div>
            {department.agents.map((agent) => <button key={agent.id} className={selected === agent.id ? "workforce-agent selected" : "workforce-agent"} onClick={() => openAgent({ ...agent, department: department.name })}>
              <span className="workforce-avatar" style={{ "--orb-color": agent.orbColor || defaultColor } as CSSProperties}>{agent.name.slice(0, 1)}</span><span className="workforce-agent-copy"><strong>{agent.name}</strong><small>{agent.title}</small></span><span className="workforce-chevron">›</span>
            </button>)}
          </div>)}
        </div>
        <div className="workforce-main-column">
          <div className="panel workforce-profile">
            <div className="workforce-profile-hero">
              <span className="workforce-profile-orb" style={{ "--orb-color": selectedAgent?.orbColor || defaultColor } as CSSProperties}><span>{selectedAgent?.name.slice(0, 1) || "?"}</span></span>
              <div><p className="eyebrow">AGENT PROFILE</p><h2>{selectedAgent?.name || "Select an agent"}</h2><p className="workforce-role-title">{selectedAgent?.title}</p><p className="workforce-reporting">Reports to <strong>{selectedAgent?.reportsTo || "Founder"}</strong>{selectedAgent?.department ? " · " + selectedAgent.department : ""}</p></div>
            </div>
            <div className="workforce-persona"><span>{selectedAgent?.presentationGender === "female" ? "Female presentation" : selectedAgent?.presentationGender === "male" ? "Male presentation" : "AI persona"}</span><p>{selectedAgent?.personality || "Professional, clear, and evidence-led."}</p></div>
            <h3>Responsibilities</h3><ul>{(selectedAgent?.responsibilities || []).map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="workforce-permissions"><div><strong>Allowed task types</strong><p>{(selectedAgent?.allowedActions || []).join(" · ") || "Coordination and reporting"}</p></div><div><strong>Restricted actions</strong><p>{(selectedAgent?.restrictedActions || []).join(" · ") || "No self-granted permissions"}</p></div></div>
            <button className="primary-button workforce-open-chat" onClick={() => selectedAgent && openAgent(selectedAgent)}><MessageCircle size={15} /> Open text mode with {selectedAgent?.name || "agent"}</button>
          </div>
        </div>
      </div>
      <div className="workforce-footnote">Model: {status?.model || "configured by server"} · Shared server-side key · No browser secrets · Founder approval remains mandatory for consequential actions.</div>
    </> : <div className="panel workforce-loading">The workforce registry could not be loaded.</div>}

    {registry && <div className="workforce-orb-dock" aria-label="AI workforce floating orbs">
      <div className="workforce-orb-dock-label"><span><Sparkles size={13} /> WORKFORCE ORBS</span><small>{agents.length} agents</small></div>
      <div className="workforce-orb-grid">
        {agents.map((agent) => <button key={agent.id} className={selected === agent.id ? "workforce-floating-orb active" : "workforce-floating-orb"} style={{ "--orb-color": agent.orbColor || defaultColor } as CSSProperties} onClick={() => openAgent(agent)} title={agent.name} aria-label={"Open text mode with " + agent.name}>
          <span>{agent.name.slice(0, 1)}</span><small>{agent.name}</small>
        </button>)}
      </div>
    </div>}

    {chatOpen && selectedAgent && <div className="workforce-chat-panel" role="dialog" aria-modal="false" aria-label={"Text chat with " + selectedAgent.name}>
      <div className="workforce-chat-header" style={{ "--orb-color": selectedAgent.orbColor || defaultColor } as CSSProperties}>
        <span className="workforce-chat-avatar">{selectedAgent.name.slice(0, 1)}</span>
        <div><strong>{selectedAgent.name}</strong><small>{selectedAgent.title} · Text mode</small></div>
        <button className="workforce-chat-close" onClick={() => setChatOpen(false)} aria-label="Close agent text mode"><X size={17} /></button>
      </div>
      <div className="workforce-chat-context"><span>{selectedAgent.presentationGender === "female" ? "Female" : "Male"} persona</span><p>{selectedAgent.personality}</p></div>
      <div className="workforce-chat-messages">
        {chatHistory.length === 0 && <div className="workforce-chat-empty"><span className="workforce-chat-empty-orb" style={{ "--orb-color": selectedAgent.orbColor || defaultColor } as CSSProperties}>{selectedAgent.name.slice(0, 1)}</span><strong>You're connected to {selectedAgent.name}</strong><p>Send a message or task. {selectedAgent.name} will respond in their assigned role and personality.</p></div>}
        {chatHistory.map((message, index) => <div className={"workforce-chat-message " + message.role} key={index}><span>{message.role === "user" ? "YOU" : selectedAgent.name.toUpperCase()}</span><p>{message.content}</p></div>)}
        {running && <div className="workforce-chat-thinking"><LoaderCircle size={14} className="workforce-spinner" /> {selectedAgent.name} is thinking…</div>}
      </div>
      {error && <div className="workforce-chat-error" role="alert"><CircleAlert size={14} />{error}</div>}
      <form className="workforce-chat-form" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
        <textarea aria-label={"Message " + selectedAgent.name} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={"Message " + selectedAgent.name + "…"} rows={2} maxLength={10000} />
        <button className="primary-button" type="submit" disabled={!chatInput.trim() || running || !status?.configured}>{running ? <LoaderCircle size={15} className="workforce-spinner" /> : <MessageCircle size={15} />} Send</button>
      </form>
      {!status?.configured && <p className="workforce-chat-unconfigured">Text mode needs the existing ANTHROPIC_API_KEY in the server's private environment.</p>}
    </div>}
    <AIWorkforceGroupChat agents={agents} status={status} />
  </section>;
}
