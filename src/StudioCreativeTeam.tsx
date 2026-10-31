import { useEffect, useState, type CSSProperties } from "react";
import { Bot, ChevronDown, ChevronUp, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";

type StudioAgent = { id: string; name: string; title: string; personality?: string; orbColor?: string; responsibilities?: string[]; allowedActions?: string[]; restrictedActions?: string[] };
type Registry = { ivy: StudioAgent; departments: { agents: StudioAgent[] }[] };
type WorkforceStatus = { configured: boolean; model?: string };
type Message = { role: "user" | "assistant"; content: string };

const studioBrief = "You are assisting inside Pruden Studios. Help the founder plan and review a manual creative workflow for photography, image retouching, poster/design layout and video editing. For now, the founder is editing manually: do not claim to edit, modify, render, upload, or save files yourself. Give practical step-by-step guidance, critique, shot ideas, composition and export advice. Only suggest future AI execution as a later capability. Be clear about your role and permissions.";

export default function StudioCreativeTeam({ selectedAsset }: { selectedAsset?: { title: string; fileName: string; category: string; mimeType: string; size: number } | null }) {
  const [agents, setAgents] = useState<StudioAgent[]>([]);
  const [configured, setConfigured] = useState(false);
  const [active, setActive] = useState<"lumi" | "motion">("lumi");
  const [messages, setMessages] = useState<Record<string, Message[]>>({ lumi: [], motion: [] });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const agent = agents.find((item) => item.id.toLowerCase() === active || item.name.toLowerCase() === active);
  const history = messages[active] || [];

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/workforce/agents").then(async (response) => { if (!response.ok) throw new Error("Workforce registry is unavailable."); return response.json() as Promise<Registry>; }),
      fetch("/api/workforce/status").then(async (response) => { if (!response.ok) throw new Error("Workforce status is unavailable."); return response.json() as Promise<WorkforceStatus>; })
    ]).then(([registry, status]) => {
      if (!alive) return;
      const all = [registry.ivy, ...registry.departments.flatMap((department) => department.agents)];
      setAgents(all.filter((item) => ["lumi", "motion"].includes(item.id.toLowerCase()) || ["lumi", "motion"].includes(item.name.toLowerCase())));
      setConfigured(Boolean(status.configured));
    }).catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : "Could not connect to the workforce."); });
    return () => { alive = false; };
  }, []);

  async function send() {
    const prompt = draft.trim();
    const activeKey = active;
    const targetAgent = agent;
    if (!prompt || !targetAgent || loading || !configured) return;
    const context = selectedAsset
      ? "\n\nCURRENT STUDIO ASSET: " + selectedAsset.title + " (" + selectedAsset.fileName + "), category " + selectedAsset.category + ", type " + selectedAsset.mimeType + ", size " + selectedAsset.size + " bytes."
      : "\n\nNo specific asset is selected.";
    const next = [...history, { role: "user" as const, content: prompt }];
    setMessages((current) => ({ ...current, [activeKey]: next }));
    setDraft("");
    setLoading(true);
    setError("");
    try {
      const conversation = next.map((item) => (item.role === "user" ? "FOUNDER" : targetAgent.name.toUpperCase()) + ": " + item.content).join("\n\n");
      const response = await fetch("/api/workforce/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: targetAgent.id, task: studioBrief + context + "\n\nContinue this conversation in your assigned role.\n\n" + conversation })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Agent request failed.");
      setMessages((current) => ({ ...current, [activeKey]: [...(current[activeKey] || next), { role: "assistant", content: String(data.output || "No response was returned.") }] }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Agent request failed."); }
    finally { setLoading(false); }
  }

  if (hidden && selectedAsset) return <div className="studio-team-reopen-dock"><button className="studio-team-reopen" onClick={() => setHidden(false)}><Sparkles size={15} /> Lumi & Motion</button></div>;

  return <section className={(selectedAsset ? "studio-team panel floating " : "studio-team panel ") + (expanded ? "is-expanded" : "is-collapsed")}>
    <div className="studio-team-dockbar">
      <div className="studio-team-dock-title"><Sparkles size={15} /><strong>Creative assistants</strong><span className={configured && agents.length === 2 ? "studio-team-status online" : "studio-team-status"}>{agents.length}/2</span></div>
      <div className="studio-team-dock-actions">
        <button aria-label={expanded ? "Collapse Lumi and Motion" : "Expand Lumi and Motion"} title={expanded ? "Collapse assistants" : "Expand assistants"} onClick={() => setExpanded((value) => !value)}>{expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
        {selectedAsset && <button aria-label="Hide Lumi and Motion" title="Hide assistants while editing" onClick={() => setHidden(true)}><X size={16} /></button>}
      </div>
    </div>
    {expanded && <>
      <div className="studio-team-heading">
        <div><p className="eyebrow">LUMI / MOTION WORKFORCE LINK</p><h2>Work alongside your creative team</h2><p>Get direction and feedback while keeping manual editing under your control.</p></div>
      </div>
      <div className="studio-team-tabs">
        <button className={active === "lumi" ? "active lumi" : ""} onClick={() => { setActive("lumi"); setError(""); }}><span>L</span><div><strong>Lumi</strong><small>Visual direction & image craft</small></div></button>
        <button className={active === "motion" ? "active motion" : ""} onClick={() => { setActive("motion"); setError(""); }}><span>M</span><div><strong>Motion</strong><small>Video, pacing & storytelling</small></div></button>
      </div>
      {agent ? <div className="studio-team-chat">
        <div className="studio-team-agent"><span style={{ "--agent-color": agent.orbColor || (active === "lumi" ? "#a78bfa" : "#38bdf8") } as CSSProperties}>{active.slice(0,1).toUpperCase()}</span><div><strong>{agent.name}</strong><small>{agent.title}</small></div><Bot size={16} /></div>
        <div className="studio-team-messages">
          {history.length === 0 && <div className="studio-team-empty"><MessageCircle size={22} /><strong>Start a creative session with {agent.name}</strong><p>{active === "lumi" ? "Ask for a portrait retouching workflow, lighting critique, colour grading advice or poster composition." : "Ask for a shot sequence, editing rhythm, transition plan, storyboard or video export settings."}</p></div>}
          {history.map((item, index) => <article key={index} className={"studio-team-message " + item.role}><small>{item.role === "user" ? "YOU" : agent.name.toUpperCase()}</small><p>{item.content}</p></article>)}
          {loading && <div className="studio-team-thinking"><LoaderCircle size={14} /> {agent.name} is thinking…</div>}
        </div>
        {error && <p className="studio-team-error" role="alert">{error}</p>}
        <form className="studio-team-form" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <textarea rows={2} value={draft} maxLength={8000} onChange={(event) => setDraft(event.target.value)} placeholder={"Ask " + agent.name + " for creative guidance…"} />
          <button type="submit" className="primary-button" disabled={!draft.trim() || loading || !configured}><Send size={14} /> Send</button>
        </form>
        {!configured && <small className="studio-team-footnote">Workforce text chat needs the server-side model provider to be configured. No API key is exposed in this page.</small>}
      </div> : <div className="studio-team-unavailable">{error || "Lumi and Motion were not both found in the live workforce registry. The panel will not invent agent connections."}</div>}
      <p className="studio-team-footnote">Guidance only: neither assistant can directly manipulate or save your media in this phase.</p>
    </>}
  </section>;
}
