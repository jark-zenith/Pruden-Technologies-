import { useEffect, useRef, useState } from "react";
import { Activity, Camera, CameraOff, ChevronDown, Mic, MicOff, Send, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import IvyGmailPanel from "./IvyGmailPanel";
import { requireSupabase } from "./lib/supabase";

type IvyMessage = { role: "user" | "assistant"; content: string; imageDataUrl?: string };
type IvyAction = { type: "navigate_module" | "open_external_url"; value: string };
type IvyPreferences = { voiceOutput: boolean; continuousListening: boolean; cameraEnabled: boolean; autoStartVoice: boolean };
type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; 0: SpeechRecognitionAlternativeLike };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const PREF_KEY = "pruden-ivy-preferences-v1";
const HISTORY_KEY = "pruden-ivy-history-v1";
const defaultPreferences: IvyPreferences = { voiceOutput: true, continuousListening: true, cameraEnabled: false, autoStartVoice: false };
const INTRO_KEY = "pruden-ivy-intro-spoken-v1";
const IVY_INTRO = "Hello, I'm Ivy — your PRUDEN Assistant. I was created by Pruden Jackson Gideon, also known as Jark Pruden, as part of the PRUDEN technology ecosystem. PRUDEN builds and explores AI, software, automation, digital systems, creative technology, education, and research. Built from Kenya, designed for the world. I'm here to help you understand your projects, organize operations, and move the next meaningful task forward. I'll be clear about what is live, what is planned, and what I cannot verify.";

function readPreferences(): IvyPreferences {
  try { return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; }
  catch { return defaultPreferences; }
}
function readHistory(): IvyMessage[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value.slice(-30) : [];
  } catch { return []; }
}
function dataUrlParts(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Unsupported image format.");
  return { mediaType: match[1], data: match[2] };
}

export default function IvyAssistant({ activeModule, availableModules, onNavigate, workspace }: {
  activeModule: string;
  availableModules: string[];
  onNavigate: (module: string) => void;
  workspace: { projects: Array<{ name: string; status: string }>; tasks: Array<{ title: string; state: string; priority: string }>; approvals: Array<{ title: string; status: string }>; repositories: Array<{ name: string; repoUrl: string; visibility: string; archived: boolean; deploymentUrl: string | null; deploymentServices: Array<{ name: string; url: string; type: string; suspended: string }> }>; backendStatus: string };
}) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<IvyMessage[]>(readHistory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<IvyPreferences>(readPreferences);
  const [providerReady, setProviderReady] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartRecognitionRef = useRef(false);
  const waitingForReplyRef = useRef(false);
  const recognitionStarterRef = useRef<(() => void) | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const sendMessageRef = useRef<(textOverride?: string) => Promise<void>>(async () => {});
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => { try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-30).map(({ role, content }) => ({ role, content })))); } catch { /* Session history is best-effort; never block the assistant. */ } endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); }, [preferences]);
  useEffect(() => {
    let alive = true;
    fetch("/api/ivy/status").then((response) => response.json()).then((data) => { if (alive) setProviderReady(Boolean(data.configured)); }).catch(() => { if (alive) setProviderReady(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => () => {
    restartRecognitionRef.current = false;
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOpen]);
  useEffect(() => {
    if (!preferences.autoStartVoice || autoStartAttemptedRef.current) return;
    setOpen(true);
    const timer = window.setTimeout(() => {
      autoStartAttemptedRef.current = true;
      startVoice(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  function speak(text: string, onDone?: () => void) {
    if (!preferences.voiceOutput || !("speechSynthesis" in window)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.08;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => { setSpeaking(false); onDone?.(); };
    utterance.onerror = () => { setSpeaking(false); onDone?.(); };
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find((voice) => /female|samantha|zira|victoria|karen|google uk english female/i.test(voice.name));
    if (female) utterance.voice = female;
    window.speechSynthesis.speak(utterance);
  }

  function stopVoice() {
    restartRecognitionRef.current = false;
    waitingForReplyRef.current = false;
    recognitionStarterRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setVoiceActive(false);
    setListening(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function startVoice(saveHandsFree = true) {
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Continuous speech recognition is not supported by this browser. You can still type, or try a compatible browser.");
      return;
    }
    setError("");
    setOpen(true);
    setVoiceActive(true);
    restartRecognitionRef.current = true;
    waitingForReplyRef.current = false;
    if (saveHandsFree) setPreferences((current) => ({ ...current, autoStartVoice: true }));
    const startRecognition = () => {
      if (!restartRecognitionRef.current) return;
      const recognition = new Constructor();
      recognition.lang = navigator.language || "en-US";
      recognition.continuous = preferencesRef.current.continuousListening;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const finalText: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          if (event.results[index].isFinal) finalText.push(event.results[index][0].transcript);
        }
        const transcript = finalText.join(" ").trim();
        if (transcript) {
          waitingForReplyRef.current = true;
          recognition.stop();
          void sendMessageRef.current(transcript);
        }
      };
      recognition.onerror = () => { restartRecognitionRef.current = false; setListening(false); setVoiceActive(false); };
      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        if (restartRecognitionRef.current && !waitingForReplyRef.current) window.setTimeout(startRecognition, 250);
        else setListening(false);
      };
      recognitionRef.current = recognition;
      recognitionStarterRef.current = startRecognition;
      try {
        recognition.start();
        setListening(true);
      } catch {
        restartRecognitionRef.current = false;
        setVoiceActive(false);
        setListening(false);
        setError("Your browser blocked automatic microphone startup. Click Enable hands-free and allow microphone access to continue.");
      }
    };
    let introductionHandled = false;
    const beginListening = () => {
      if (introductionHandled || !restartRecognitionRef.current) return;
      introductionHandled = true;
      startRecognition();
    };
    let introAlreadySpoken = false;
    try { introAlreadySpoken = sessionStorage.getItem(INTRO_KEY) === "1"; } catch { /* session storage may be unavailable */ }
    if (!introAlreadySpoken && preferences.voiceOutput && "speechSynthesis" in window) {
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* introduction remains best-effort */ }
      speak(IVY_INTRO, beginListening);
    } else {
      beginListening();
    }
  }

  async function enableCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not available in this browser or page context.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraOpen(true);
      setPreferences((current) => ({ ...current, cameraEnabled: true }));
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Camera access was denied or unavailable. Allow camera access in your browser settings, then try again.");
    }
  }
  function disableCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setPreferences((current) => ({ ...current, cameraEnabled: false }));
  }
  function captureImage() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setError("Wait for the camera preview to become ready."); return; }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) { setError("Could not capture a camera frame."); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.78));
    setError("");
  }

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if ((!text && !snapshot) || busy) return;
    const image = snapshot;
    const userMessage: IvyMessage = { role: "user", content: text || "Please inspect this image.", ...(image ? { imageDataUrl: image } : {}) };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setSnapshot(null);
    setBusy(true);
    setError("");
    try {
      const payloadMessages = next.slice(-16).map((message) => {
        if (!message.imageDataUrl) return { role: message.role, content: message.content };
        const parts = dataUrlParts(message.imageDataUrl);
        return { role: message.role, content: [{ type: "text", text: message.content }, { type: "image", source: { type: "base64", media_type: parts.mediaType, data: parts.data } }] };
      });
      const { data: { session }, error: sessionError } = await requireSupabase().auth.getSession();
      if (sessionError || !session?.access_token) throw new Error("Sign in to your PRUDEN workspace before asking Ivy to access company records.");
      const response = await fetch("/api/ivy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, accessToken: session.access_token, context: { activeModule, availableModules, workspace } }),
      });
      const responseText = await response.text();
      let result: { error?: string; reply?: string; actions?: IvyAction[] } = {};
      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as typeof result;
        } catch {
          throw new Error(
            response.ok
              ? "Ivy's server returned an incomplete response. Please try again; if it repeats, the backend needs attention."
              : `Ivy's server returned an unexpected response (HTTP ${response.status}). Check the backend deployment and logs.`
          );
        }
      } else {
        throw new Error(
          `Ivy's server returned an empty response (HTTP ${response.status}). Check the backend deployment and logs.`
        );
      }
      if (!response.ok) throw new Error(result.error || `Ivy could not respond (HTTP ${response.status}).`);
      const reply = String(result.reply || "I couldn't produce a response this time.");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      for (const action of (result.actions || []) as IvyAction[]) {
        if (action.type === "navigate_module" && availableModules.includes(action.value)) onNavigate(action.value);
        if (action.type === "open_external_url" && /^https:\/\//i.test(action.value)) window.open(action.value, "_blank", "noopener,noreferrer");
      }
      if (preferences.voiceOutput && voiceActive) {
        speak(reply, () => {
          waitingForReplyRef.current = false;
          if (restartRecognitionRef.current) recognitionStarterRef.current?.();
        });
      } else if (voiceActive) {
        waitingForReplyRef.current = false;
        if (restartRecognitionRef.current) recognitionStarterRef.current?.();
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Ivy could not connect.";
      setError(message);
      const recoveryReply = "I couldn't complete that request. " + message;
      setMessages((current) => [...current, { role: "assistant", content: recoveryReply }]);
      if (voiceActive) {
        const resumeListening = () => {
          waitingForReplyRef.current = false;
          if (restartRecognitionRef.current) recognitionStarterRef.current?.();
        };
        if (preferences.voiceOutput) speak(recoveryReply, resumeListening);
        else resumeListening();
      }
    } finally {
      setBusy(false);
    }
  }

  sendMessageRef.current = sendMessage;

  return <>
    <button className={`ivy-orb ${open ? "is-open" : ""} ${listening ? "is-listening" : ""} ${speaking ? "is-speaking" : ""}`} onClick={() => { if (open) disableCamera(); setOpen((value) => !value); }} aria-label={open ? "Close Ivy assistant" : "Open Ivy assistant"} title="Ivy · PRUDEN AI">
      <span className="ivy-orb-halo" /><span className="ivy-orb-core ivy-face" aria-hidden="true"><span className="ivy-face-eyes"><i /><i /></span><span className="ivy-face-mouth" /></span><span className="ivy-orb-status" />
    </button>
    {open && <section className="ivy-panel" role="dialog" aria-label="Ivy AI assistant">
      <header className="ivy-header"><div className={`ivy-avatar ivy-face-avatar ${listening ? "is-listening" : ""} ${speaking ? "is-speaking" : ""}`} aria-hidden="true"><span className="ivy-face-eyes"><i /><i /></span><span className="ivy-face-mouth" /></div><div className="ivy-heading"><strong>Ivy</strong><span><i className={providerReady ? "ivy-status-ready" : ""} /> {providerReady === null ? "Checking AI connection…" : providerReady ? "AI provider configured" : "AI provider unavailable"} · PRUDEN AI</span></div><button className="ivy-icon-button" title="Stop voice" onClick={stopVoice}><MicOff size={15} /></button><button className="ivy-icon-button" title="Minimize Ivy" onClick={() => { disableCamera(); setOpen(false); }}><ChevronDown size={17} /></button><button className="ivy-icon-button" title="Close Ivy" onClick={() => { disableCamera(); setOpen(false); }}><X size={16} /></button></header>
      <div className="ivy-session-bar"><span className={listening ? "active" : ""}><Activity size={13} /> {listening ? "Hands-free listening active" : voiceActive ? "Voice session active" : preferences.autoStartVoice ? "Hands-free mode enabled" : "Enable hands-free mode"}</span><button onClick={voiceActive ? stopVoice : () => startVoice(true)}>{voiceActive ? <><MicOff size={13} /> Stop session</> : <><Mic size={13} /> Enable hands-free</>}</button></div>
      <div className={`ivy-presence ${listening ? "is-listening" : ""} ${speaking ? "is-speaking" : ""} ${busy ? "is-thinking" : ""}`} aria-live="polite"><div className="ivy-presence-face" aria-hidden="true"><span className="ivy-face-eyes"><i /><i /></span><span className="ivy-face-mouth" /></div><div className="ivy-presence-copy"><strong>{listening ? "I am listening" : speaking ? "I am speaking" : busy ? "Thinking through it" : "I am here, Mr. Jark"}</strong><span>{listening ? "Go ahead — tell me what you need." : speaking ? "You can interrupt me by stopping the session." : "Tap the microphone to start our voice session."}</span></div><span className="ivy-presence-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
      <div className="ivy-context"><span>WORKSPACE</span><strong>{activeModule}</strong><span className="ivy-context-dot" /> <span>{workspace.repositories.length} repositories · {workspace.tasks.length} tasks</span></div>
      <div className="ivy-messages">
        {messages.length === 0 && <div className="ivy-welcome"><div className="ivy-welcome-mark"><Sparkles size={25} /></div><p className="eyebrow">YOUR OPERATIONS COMPANION</p><h3>Hi, I'm Ivy.</h3><p>I'm Ivy, your PRUDEN Assistant, created by Pruden Jackson Gideon (Jark Pruden). PRUDEN's ecosystem spans AI, software, automation, digital systems, creative technology, education, and research. Built from Kenya, designed for the world. Ask about projects, tasks, approvals, or the next priority; I'll distinguish verified records from plans and unconnected systems.</p><div className="ivy-suggestions">{["Summarize my current workspace", "What should I focus on next?", "Open Infrastructure"].map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(suggestion)}>{suggestion}</button>)}</div></div>}
        {messages.map((message, index) => <article className={`ivy-message ${message.role}`} key={index}><span>{message.role === "assistant" ? "IVY" : "YOU"}</span><p>{message.content}</p>{message.imageDataUrl && <img src={message.imageDataUrl} alt="Camera snapshot attached to your message" />}</article>)}
        {busy && <div className="ivy-thinking"><i /><i /><i /> Ivy is thinking…</div>}
        <div ref={endRef} />
      </div>
      {cameraOpen && <div className="ivy-camera"><video ref={videoRef} autoPlay playsInline muted /><div><button onClick={captureImage}><Camera size={14} /> Capture for Ivy</button><button onClick={disableCamera}><CameraOff size={14} /> Stop camera</button></div>{snapshot && <p>Snapshot ready — it will be sent only with your next message.</p>}</div>}
      {error && <div className="ivy-error" role="alert">{error}</div>}
      <form className="ivy-composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}><button type="button" className="ivy-icon-button" title={cameraOpen ? "Camera active" : "Enable camera"} onClick={() => cameraOpen ? disableCamera() : void enableCamera()}>{cameraOpen ? <CameraOff size={17} /> : <Camera size={17} />}</button><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={voiceActive && listening ? "I'm listening… or type here" : "Ask Ivy anything…"} aria-label="Message Ivy" /><button type="submit" className="ivy-send" disabled={busy || (!input.trim() && !snapshot)} aria-label="Send message"><Send size={16} /></button></form>
      <footer className="ivy-footer"><span>{voiceActive ? "Microphone active · click stop to end" : preferences.autoStartVoice ? "Hands-free enabled · waiting for browser permission" : "Hands-free off until you enable it"}</span><button onClick={() => onNavigate("Reports & Settings")}><Settings2 size={13} /> Manage Ivy</button><button onClick={() => { stopVoice(); disableCamera(); setMessages([]); sessionStorage.removeItem(HISTORY_KEY); }} title="Clear this session">Clear</button></footer>
      <div className="ivy-privacy"><ShieldCheck size={12} /> {voiceActive ? "Hands-free conversation stays active while you navigate or minimize Ivy. Use Stop session to turn the microphone off." : "Microphone stays off until you explicitly enable hands-free mode. Camera frames are sent only when you capture and send them."}</div>
    </section>}
  </>;
}

type IvyCapabilityItem = { status?: string; provider?: string; note?: string; readOnlyTools?: boolean; writeToolsEnabled?: boolean; signingEnabled?: boolean; productionDeployEnabled?: boolean };

export function IvySettingsPanel() {
  const [preferences, setPreferences] = useState<IvyPreferences>(readPreferences);
  const [provider, setProvider] = useState<"checking" | "ready" | "missing">("checking");
  const [capabilities, setCapabilities] = useState<Record<string, IvyCapabilityItem>>({});
  useEffect(() => {
    let alive = true;
    fetch("/api/ivy/capabilities").then((response) => response.json()).then((data) => { if (alive) setCapabilities(data || {}); }).catch(() => { if (alive) setCapabilities({}); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/ivy/status").then((response) => response.json()).then((data) => { if (alive) setProvider(data.configured ? "ready" : "missing"); }).catch(() => { if (alive) setProvider("missing"); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); }, [preferences]);
  const toggle = (key: keyof IvyPreferences) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  return <div className="ivy-settings">
    <div className="ivy-settings-hero"><div className="ivy-avatar large"><Sparkles size={25} /></div><div><p className="eyebrow">PERSONAL AI / OPERATIONS</p><h2>Ivy settings</h2><p>Manage Ivy's voice, privacy controls and connection status.</p></div><span className={provider === "ready" ? "ivy-provider-badge ready" : "ivy-provider-badge"}>{provider === "checking" ? "CHECKING" : provider === "ready" ? "CLAUDE KEY SET" : "API KEY NOT SET"}</span></div>
    <div className="ivy-settings-grid">
      <section className="panel ivy-setting-card"><h3>Voice & interaction</h3><p>Browser speech recognition where supported. Enable hands-free mode once; Ivy will try to resume when you return to the dashboard. Browser permissions and autoplay rules still apply.</p>
        <label className="ivy-setting-row"><span><strong>Spoken responses</strong><small>Read Ivy's replies aloud during an active voice session.</small></span><input type="checkbox" checked={preferences.voiceOutput} onChange={() => toggle("voiceOutput")} /></label>
        <label className="ivy-setting-row"><span><strong>Continuous listening</strong><small>Keep listening during this active dashboard session, pausing while Ivy speaks.</small></span><input type="checkbox" checked={preferences.continuousListening} onChange={() => toggle("continuousListening")} /></label>
        <label className="ivy-setting-row"><span><strong>Hands-free on arrival</strong><small>After you explicitly enable microphone access, Ivy will try to start when you return to this site. Your browser may still require another gesture.</small></span><input type="checkbox" checked={preferences.autoStartVoice} onChange={() => toggle("autoStartVoice")} /></label>
      </section>
      <section className="panel ivy-setting-card"><h3>Privacy & capabilities</h3><p>Permission is requested by the browser when you activate a capability. You can revoke it at any time.</p>
        <div className="ivy-setting-row"><span><strong>Microphone</strong><small>Requires browser permission. Hands-free startup is attempted only after you opt in.</small></span><span className="ivy-capability-tag">ON DEMAND</span></div>
        <div className="ivy-setting-row"><span><strong>Camera</strong><small>Preview and capture are manual. A frame is shared with Claude only when you send it.</small></span><span className="ivy-capability-tag">ON DEMAND</span></div>
        <div className="ivy-setting-row"><span><strong>Workspace navigation</strong><small>Ivy can open any current PTMS page and inspect permitted information. Opening a page or editor never grants permission to change it.</small></span><span className="ivy-capability-tag">READ ONLY</span></div>
      </section>
      <section className="panel ivy-setting-card"><h3>Claude connection</h3><p>The Anthropic key stays on the private server and is never stored in this browser.</p><div className="ivy-connection-row"><span>Provider status</span><strong>{provider === "checking" ? "Checking…" : provider === "ready" ? "Configured" : "Waiting for ANTHROPIC_API_KEY"}</strong></div><div className="ivy-connection-row"><span>Voice provider</span><strong>Browser speech APIs</strong></div><div className="ivy-connection-row"><span>Persistent memory</span><strong>Setup pending · database migration required</strong></div><div className="ivy-connection-row"><span>External integrations</span><strong>Read-only foundation only</strong></div></section>
      <section className="panel ivy-setting-card"><h3>Safety boundaries</h3><p>Ivy is a read-only co-pilot. She can navigate, inspect permitted workspace data, and report findings, but cannot edit Studio media, change records or settings, create tasks, approve requests, send messages, or execute actions from chat.</p><div className="ivy-safety-note"><ShieldCheck size={16} /> Page access is not edit permission. Changes remain under your control.</div></section>
      <section className="panel ivy-setting-card ivy-integration-status"><h3>Integration readiness</h3><p>These states report implementation/configuration only. “Configured, unverified” means a secret is present; it does not prove the provider connection works.</p>{[["reasoning","Claude reasoning"],["workspaceDatabase","Workspace database"],["email","Gmail"],["github","GitHub"],["whatsapp","WhatsApp"],["payments","Payments"],["contracts","Contract signing"],["deployments","Deployments"]].map(([key,label]) => { const item = capabilities[key] || {}; const state = item.status || "checking"; const text = state === "configured_unverified" ? "CONFIGURED · UNVERIFIED" : state === "not_connected" ? "NOT CONNECTED" : state === "setup_required" ? "SETUP REQUIRED" : state === "not_implemented" ? "NOT IMPLEMENTED" : "CHECKING"; return <div className="ivy-connection-row" key={key}><span>{label}</span><strong className={state === "not_implemented" || state === "not_connected" || state === "setup_required" ? "ivy-capability-state inactive" : "ivy-capability-state"}>{text}</strong></div>; })}</section>
    </div>
    <IvyGmailPanel />
  </div>;
}
