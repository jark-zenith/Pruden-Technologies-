import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import App from "./App";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const shell: React.CSSProperties = { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "radial-gradient(ellipse at 50% 0%, #17375b 0%, #080d17 58%)", color: "#edf4ff", fontFamily: "Inter, system-ui, sans-serif" };
const card: React.CSSProperties = { width: "min(100%, 440px)", border: "1px solid #2c405b", borderRadius: 24, padding: 32, background: "#0d1625f2", boxShadow: "0 24px 90px #0008" };
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "13px 14px", marginTop: 7, borderRadius: 11, border: "1px solid #344761", background: "#08111f", color: "#fff", fontSize: 15 };
const ALLOWED_EMAILS = new Set([
  "jarkpruden@gmail.com",
  "jarksulein@gmail.com",
  "ivyassistantai@gmail.com",
  "developerjarkai@gmail.com",
  "chatgpt6ai@gmail.com",
]);
const button: React.CSSProperties = { width: "100%", marginTop: 18, padding: 14, border: 0, borderRadius: 11, background: "#419bff", color: "#06101f", fontWeight: 800, cursor: "pointer", fontSize: 14 };

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const allowSignup = import.meta.env.VITE_ALLOW_SIGNUP === "true";

  useEffect(() => {
    const auth = supabase;
    if (!auth) { setChecking(false); return; }
    let active = true;
    auth.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (sessionError && active) setError(sessionError.message);
      const current = data.session;
      if (current?.user.email && !ALLOWED_EMAILS.has(current.user.email.toLowerCase())) {
        await auth.auth.signOut();
        if (active) {
          setSession(null);
          setError("This email is not authorized to access PRUDEN COMMAND.");
        }
      } else if (active) {
        setSession(current);
      }
      if (active) setChecking(false);
    }).catch((err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not restore your session.");
        setChecking(false);
      }
    });
    const { data: listener } = auth.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.user.email && !ALLOWED_EMAILS.has(nextSession.user.email.toLowerCase())) {
        setSession(null);
        setError("This email is not authorized to access PRUDEN COMMAND.");
        void auth.auth.signOut();
      } else {
        setSession(nextSession);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const auth = supabase;
    if (!auth) {
      setError("Supabase is not configured for this deployment. Please contact the workspace administrator.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!ALLOWED_EMAILS.has(normalizedEmail)) {
        throw new Error("Access denied. Use one of the five approved management-system email addresses.");
      }
      if (mode === "signin") {
        const { error: authError } = await auth.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
      } else {
        if (!allowSignup) throw new Error("Self-service account creation is disabled on this deployment.");
        const { data, error: authError } = await auth.auth.signUp({ email: normalizedEmail, password });
        if (authError) throw authError;
        if (!data.session) setMessage("Account created. Check your email for the confirmation link, then return here to sign in.");
        else setMessage("Account created successfully.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const client = supabase;
  if (checking) return <main style={shell}><section style={card}><strong>PRUDEN COMMAND</strong><p style={{ color: "#a8b8cd" }}>Restoring your secure session...</p></section></main>;
  if (!isSupabaseConfigured || !client) return <main style={shell}><section style={card}><div style={{ color: "#83c9ff", fontSize: 11, letterSpacing: ".2em", fontWeight: 800 }}>PRUDEN TECHNOLOGIES / COMMAND</div><h1>Backend configuration required</h1><p style={{ color: "#a8b8cd", lineHeight: 1.6 }}>The application is waiting for its Supabase URL and publishable key to be configured in the deployment environment. No private service key belongs in the browser.</p></section></main>;
  if (session?.user) return <App user={session.user} onSignOut={() => { void client.auth.signOut(); }} />;

  return <main style={shell}><section style={card}>
    <div style={{ width: 50, height: 50, display: "grid", placeItems: "center", borderRadius: 15, background: "linear-gradient(145deg,#5cbcff,#3165db)", fontWeight: 900, fontSize: 21 }}>P</div>
    <p style={{ color: "#83c9ff", fontSize: 11, letterSpacing: ".2em", fontWeight: 800, marginTop: 22 }}>PRUDEN TECHNOLOGIES / COMMAND</p>
    <h1 style={{ margin: "0 0 8px", fontSize: 29, letterSpacing: "-.04em" }}>{mode === "signin" ? "Welcome back." : "Create your workspace access."}</h1>
    <p style={{ color: "#a8b8cd", lineHeight: 1.6, fontSize: 14 }}>Only five pre-approved company email addresses can access operations. Use your individual account password.</p>
    <form onSubmit={submit}>
      <label style={{ display: "block", marginTop: 20, fontSize: 12, fontWeight: 700 }}>Email address<input style={field} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label style={{ display: "block", marginTop: 16, fontSize: 12, fontWeight: 700 }}>Password<input style={field} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
      {error && <p role="alert" style={{ color: "#ff9b9b", fontSize: 13 }}>{error}</p>}
      {message && <p role="status" style={{ color: "#8de2bd", fontSize: 13 }}>{message}</p>}
      <button style={{ ...button, opacity: busy ? .7 : 1 }} disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in securely" : "Create account"}</button>
    </form>
    {allowSignup && <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }} style={{ ...button, marginTop: 10, background: "transparent", border: "1px solid #344761", color: "#c4d5eb" }}>{mode === "signin" ? "New here? Create an account" : "Already registered? Sign in"}</button>}
    {!allowSignup && <p style={{ color: "#7488a3", fontSize: 12 }}>Account creation is restricted. Use the private command deployment or ask the workspace administrator.</p>}
    <div style={{ borderTop: "1px solid #26364c", paddingTop: 16, marginTop: 24, color: "#7488a3", fontSize: 11, letterSpacing: ".08em" }}>BUILD. LEARN. INVENT. EVOLVE.</div>
  </section></main>;
}
