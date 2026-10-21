import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Headphones, LoaderCircle, MessageCircle, Mic, MicOff, Users, Volume2, X, CircleAlert } from "lucide-react";

type Agent = { id: string; name: string; title: string; department?: string; orbColor?: string };
type Props = { agents: Agent[]; status: { configured?: boolean } | null };
type Message = { role: "user" | "assistant"; content: string; name?: string; at?: string };
type Mode = "text" | "conversation";

export default function AIWorkforceGroupChat({ agents, status }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);

  useEffect(() => {
    fetch("/api/workforce/group-context").then(r => r.ok ? r.json() : {messages: []}).then(data => {
      setMessages((data.messages || []).map((m: any) => ({role: m.role === "Founder" ? "user" : "assistant", content: m.content, name: m.name, at: m.at})));
    }).catch(() => {});
  }, []);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
    window.speechSynthesis.speak(utterance);
  }
  function startListening() {
    const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) { setError("Speech input is not supported here. Type your message instead."); return; }
    const recognition = new Recognition();
    recognition.lang = "en-KE"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => { const value = event.results?.[0]?.[0]?.transcript; if (typeof value === "string") setInput(v => v ? v + " " + value : value); setListening(false); };
    recognition.onerror = () => { setListening(false); setError("Microphone input failed or permission was denied."); };
    recognition.onend = () => setListening(false);
    try { recognition.start(); setListening(true); setError(""); } catch { setListening(false); setError("Could not start microphone input."); }
  }
  async function send(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setMessages(current => [...current, {role:"user",content:message,name:"Founder",at:new Date().toISOString()}]);
    setInput(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/workforce/group-run", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Group message failed.");
      setMessages((data.messages || []).map((m: any) => ({role:m.role === "Founder" ? "user" : "assistant",content:m.content,name:m.name,at:m.at})));
      if (mode === "conversation" && speakReplies) speak(String(data.output || ""));
    } catch (e) { setError(e instanceof Error ? e.message : "Group message failed."); }
    finally { setBusy(false); }
  }

  return <>
    <button className="workforce-group-launcher" onClick={() => setOpen(v => !v)} aria-label="Open the shared Workforce Group chat">
      <span className="workforce-group-launcher-orb"><Users size={18}/></span><span className="workforce-group-launcher-copy"><strong>Workforce Group</strong><small>You + all AI specialists</small></span>
    </button>
    {open && <div className="workforce-group-panel" role="dialog" aria-modal="false" aria-label="Workforce Group chat" style={{"--orb-color":"#78e3c5"} as CSSProperties}>
      <div className="workforce-chat-header">
        <span className="workforce-chat-avatar"><Users size={18}/></span><div><strong>Workforce Group</strong><small>Founder + {agents.length} registered AI specialists</small></div>
        <button className="workforce-chat-close" onClick={() => {setOpen(false);setListening(false);if(window.speechSynthesis)window.speechSynthesis.cancel();}} aria-label="Close group chat"><X size={17}/></button>
      </div>
      <div className="workforce-group-members">{agents.slice(0,8).map(a => <span key={a.id} style={{borderColor:(a.orbColor||"#78e3c5")+"66"}}>{a.name}</span>)}{agents.length>8 && <span>+{agents.length-8} more</span>}</div>
      <div className="workforce-group-mode"><button className={mode==="text"?"active":""} onClick={()=>setMode("text")}><MessageCircle size={13}/> Text</button><button className={mode==="conversation"?"active":""} onClick={()=>setMode("conversation")}><Headphones size={13}/> Conversation</button>{mode==="conversation" && <button className="active" onClick={()=>setSpeakReplies(v=>!v)}><Volume2 size={13}/>{speakReplies?"Voice on":"Voice off"}</button>}</div>
      <div className="workforce-chat-messages">
        {messages.length===0 && <div className="workforce-chat-empty"><span className="workforce-chat-empty-orb"><Users size={18}/></span><strong>Start a team conversation</strong><p>Message the group naturally. Ivy coordinates when useful and relevant specialists contribute by name.</p></div>}
        {messages.map((m,i)=><div className={"workforce-chat-message "+m.role} key={i}><span>{m.role==="user"?"YOU":(m.name||"AI WORKFORCE").toUpperCase()}</span><p>{m.content}</p></div>)}
        {busy && <div className="workforce-chat-thinking"><LoaderCircle size={14} className="workforce-spinner"/> Workforce is thinking…</div>}
      </div>
      {error && <div className="workforce-chat-error" role="alert"><CircleAlert size={14}/>{error}</div>}
      <form className="workforce-chat-form" onSubmit={send}>
        <textarea aria-label="Message Workforce Group" value={input} onChange={e=>setInput(e.target.value)} placeholder={mode==="conversation"?"Speak or type to the whole team…":"Message the whole team…"} rows={2} maxLength={12000}/>
        {mode==="conversation" && <button type="button" className="workforce-group-mic" onClick={()=>listening?setListening(false):startListening()} aria-label="Use microphone">{listening?<MicOff size={15}/>:<Mic size={15}/>}</button>}
        <button className="primary-button" type="submit" disabled={!input.trim()||busy||!status?.configured}>{busy?<LoaderCircle size={15} className="workforce-spinner"/>:<MessageCircle size={15}/>} Send</button>
      </form>
      <p className="workforce-group-notice">Shared context is held in server memory (up to 30 messages) and can reset on restart. Voice depends on browser support. External tools and actions remain disabled.</p>
    </div>}
  </>;
}
