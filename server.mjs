import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");
const port = Number(process.env.PORT || 10000);
const secret = process.env.COMMAND_ACCESS_SECRET || "";
const cookieName = "pruden_command_session";
const lifetime = 8 * 60 * 60 * 1000;
const attempts = new Map();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "8kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
function sign(value) { return createHmac("sha256", secret).update(value).digest("hex"); }
function cookie(req) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const pair = part.trim().split("=");
    if (pair.shift() === cookieName) return decodeURIComponent(pair.join("="));
  }
  return "";
}
function isUnlocked(req) {
  if (secret.length < 24) return false;
  const token = cookie(req);
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  const issued = Number(parts[0]);
  if (!Number.isSafeInteger(issued) || Date.now() - issued > lifetime || issued > Date.now() + 60000) return false;
  const expected = Buffer.from(sign(parts[0]), "hex");
  const supplied = Buffer.from(parts[1], "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
function issueCookie(res) {
  const ts = String(Date.now());
  res.setHeader("Set-Cookie", cookieName + "=" + ts + "." + sign(ts) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800");
}
function gatePage(configured) {
  const notice = configured ? "Enter your master secret to unlock the private operations workspace." : "The administrator must configure COMMAND_ACCESS_SECRET on the server before access can be enabled.";
  const disabled = configured ? "" : "disabled";
  return [
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>PRUDEN Command · Secure Access</title>',
'<style>:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#080d17;color:#edf4ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 0%,#163052,transparent 55%),#080d17}.shell{width:min(100%,440px);border:1px solid #2c405b;border-radius:24px;padding:34px;background:#0d1625f2;box-shadow:0 24px 90px #0008}.mark{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:linear-gradient(145deg,#5cbcff,#3165db);font-weight:900;font-size:21px}.eyebrow{margin:22px 0 8px;color:#83c9ff;font-size:11px;letter-spacing:.2em;font-weight:800}h1{margin:0;font-size:30px;letter-spacing:-.04em}p{color:#a8b8cd;line-height:1.6;font-size:14px}label{display:block;margin:24px 0 8px;font-size:12px;font-weight:700}input{width:100%;padding:14px 15px;border-radius:12px;border:1px solid #344761;background:#08111f;color:white;font:inherit}button{width:100%;margin-top:14px;padding:14px;border:0;border-radius:12px;background:#419bff;color:#06101f;font:inherit;font-weight:800;cursor:pointer}.error{color:#ff9b9b;min-height:22px;font-size:13px}.foot{margin-top:24px;border-top:1px solid #26364c;padding-top:16px;color:#7488a3;font-size:11px;letter-spacing:.08em}</style></head>',
'<body><main class="shell"><div class="mark">P</div><div class="eyebrow">PRUDEN TECHNOLOGIES / COMMAND</div><h1>Private workspace.</h1><p>' + notice + '</p>',
'<form id="unlock"><label for="secret">Master secret</label><input id="secret" type="password" autocomplete="current-password" required maxlength="2048" ' + disabled + '><button id="submit" type="submit" ' + disabled + '>Unlock command centre</button><p class="error" id="error" role="alert"></p></form><div class="foot">BUILD. LEARN. INVENT. EVOLVE.</div></main>',
'<script>const f=document.getElementById("unlock"),i=document.getElementById("secret"),b=document.getElementById("submit"),e=document.getElementById("error");f.addEventListener("submit",async x=>{x.preventDefault();b.disabled=true;e.textContent="Checking secret…";try{const r=await fetch("/api/auth/unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:i.value})});const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to unlock.");location.replace("/")}catch(z){e.textContent=z.message||"Connection failed.";i.value="";i.focus()}finally{b.disabled=false}})</script></body></html>'
  ].join("");
}
app.get("/health", (_req, res) => res.json({ ok: true, service: "pruden-command", accessConfigured: secret.length >= 24 }));
app.get("/api/auth/status", (req, res) => {
  if (secret.length < 24) return res.status(503).json({ unlocked: false, configured: false });
  res.json({ unlocked: isUnlocked(req), configured: true });
});
app.post("/api/auth/unlock", (req, res) => {
  if (secret.length < 24) return res.status(503).json({ error: "Access is not configured on the server." });
  const ip = req.ip || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 900000);
  if (recent.length >= 8) return res.status(429).json({ error: "Too many attempts. Wait 15 minutes." });
  recent.push(now); attempts.set(ip, recent);
  const supplied = typeof req.body?.secret === "string" ? req.body.secret : "";
  const expected = Buffer.from(sign("unlock:" + secret), "hex");
  const actual = Buffer.from(sign("unlock:" + supplied), "hex");
  if (supplied.length > 2048 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: "Incorrect master secret." });
  attempts.delete(ip); issueCookie(res); res.json({ unlocked: true });
});
app.post("/api/auth/lock", (_req, res) => {
  res.setHeader("Set-Cookie", cookieName + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
  res.json({ locked: true });
});
app.use("/assets", express.static(path.join(dist, "assets"), { immutable: true, maxAge: "1y" }));
app.use(express.static(dist, { index: false, maxAge: "1h" }));
app.use("/api", (req, res, next) => isUnlocked(req) ? next() : res.status(401).json({ error: "Unlock PRUDEN Command to continue." }));
app.get("/", async (req, res) => {
  if (!isUnlocked(req)) return res.type("html").send(gatePage(secret.length >= 24));
  try { res.type("html").send(await readFile(path.join(dist, "index.html"), "utf8")); }
  catch { res.status(503).send("PRUDEN Command is building. Try again shortly."); }
});
app.get("*", async (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  if (!isUnlocked(req)) return res.redirect("/");
  try { res.type("html").send(await readFile(path.join(dist, "index.html"), "utf8")); }
  catch { res.status(503).send("PRUDEN Command is building. Try again shortly."); }
});
app.listen(port, "0.0.0.0", () => console.log("PRUDEN Command listening; master-secret gate " + (secret.length >= 24 ? "configured" : "NOT CONFIGURED") + "."));
