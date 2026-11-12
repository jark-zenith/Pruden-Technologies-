import test from "node:test";
import assert from "node:assert/strict";
import { executeServerDiagnostic } from "../server/server-terminal.mjs";

test("help lists the supported server diagnostics", async () => {
  const result = await executeServerDiagnostic("help");
  assert.match(result.output, /uptime/);
  assert.match(result.output, /processes/);
});

test("hostname executes a real read-only host command", async () => {
  const result = await executeServerDiagnostic("hostname");
  assert.equal(result.command, "hostname");
  assert.ok(result.output.trim().length > 0);
});

test("rejects arbitrary shell input and shell operators", async () => {
  await assert.rejects(executeServerDiagnostic("uptime;rm"), /Invalid command/);
  await assert.rejects(executeServerDiagnostic("bash"), /not allowed/);
});
