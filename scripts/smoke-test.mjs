import { spawn } from "node:child_process";

const port = 18764;
const baseUrl = `http://127.0.0.1:${port}`;
const testSecret = "ci-only-pruden-command-secret-32";
const child = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    COMMAND_ACCESS_SECRET: testSecret,
    NODE_ENV: "test",
  },
  stdio: "inherit",
});

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not become healthy within 15 seconds");
}

async function main() {
  await waitForServer();

  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  if (health.ok !== true || health.service !== "pruden-command" || health.accessConfigured !== true) {
    throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
  }

  const protectedBeforeUnlock = await fetch(`${baseUrl}/api/ivy/status`);
  if (protectedBeforeUnlock.status !== 401) throw new Error(`Expected protected API to reject locked requests with 401, got ${protectedBeforeUnlock.status}`);

  const status = await fetch(`${baseUrl}/api/auth/status`);
  if (!status.ok || (await status.json()).configured !== true) {
    throw new Error("Auth status did not report a configured test secret");
  }

  const rejected = await fetch(`${baseUrl}/api/auth/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: "incorrect-test-secret" }),
  });
  if (rejected.status !== 401) throw new Error(`Expected invalid secret to return 401, got ${rejected.status}`);

  const unlocked = await fetch(`${baseUrl}/api/auth/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: testSecret }),
  });
  if (!unlocked.ok) throw new Error(`Valid test secret failed to unlock: ${unlocked.status}`);

  const cookie = unlocked.headers.get("set-cookie") || "";
  if (!cookie.includes("pruden_command_session=") || !cookie.includes("HttpOnly") || !cookie.includes("Secure")) {
    throw new Error("Unlock response did not issue the expected secure HttpOnly session cookie");
  }

  const protectedAfterUnlock = await fetch(`${baseUrl}/api/ivy/status`, {
    headers: { cookie: cookie.split(";")[0] },
  });
  if (!protectedAfterUnlock.ok) throw new Error(`Expected protected API to allow unlocked requests, got ${protectedAfterUnlock.status}`);

  const unlockedStatus = await fetch(`${baseUrl}/api/auth/status`, {
    headers: { cookie: cookie.split(";")[0] },
  }).then((response) => response.json());
  if (unlockedStatus.unlocked !== true) throw new Error("Issued session cookie did not unlock the session");

  console.log("Infrastructure smoke test passed: health, auth status, locked API rejection, rejected unlock, valid unlock, secure cookie, unlocked API access, session validation.");
}

try {
  await main();
} finally {
  child.kill("SIGTERM");
}
