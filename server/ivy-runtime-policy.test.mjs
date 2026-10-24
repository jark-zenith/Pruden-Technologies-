import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  IVY_RUNTIME_BUDGET,
  SPECIALIST_RUNTIME_BUDGET,
  GROUP_RUNTIME_BUDGET,
  validateWorkforceRegistry
} from "./ivy-runtime-policy.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(await readFile(path.join(here, "..", "ai-workforce", "agents.json"), "utf8"));

test("authoritative workforce registry has 14 identities across six departments", () => {
  assert.deepEqual(validateWorkforceRegistry(registry), []);
  assert.equal(registry.globalControls.maxToolCallsPerIvyRequest, IVY_RUNTIME_BUDGET.maxToolCallsPerRequest);
  assert.equal(registry.globalControls.maxSpecialistRunsPerIvyRequest, IVY_RUNTIME_BUDGET.maxSpecialistRunsPerRequest);
});

test("registry validation catches a missing specialist and department inconsistency", () => {
  const broken = structuredClone(registry);
  broken.departments[2].agents = broken.departments[2].agents.filter(agent => agent.id !== "pixel");
  broken.departments.push({ id: "extra", name: "Extra", lead: "ivy", agents: [] });
  const errors = validateWorkforceRegistry(broken);
  assert.ok(errors.some(error => error.includes("Expected 6 departments")));
  assert.ok(errors.some(error => error.includes("Expected 14 registered identities")));
  assert.ok(errors.some(error => error.includes("Missing required agent: pixel")));
});

test("Sentinel must remain an independent QA/security reviewer", () => {
  const broken = structuredClone(registry);
  broken.departments.find(department => department.id === "quality-security").independent = false;
  assert.ok(validateWorkforceRegistry(broken).some(error => error.includes("marked independent")));
});

test("Ivy delegation and model-call budgets are explicit and bounded", () => {
  assert.equal(IVY_RUNTIME_BUDGET.maxSpecialistRunsPerRequest, 3);
  assert.equal(IVY_RUNTIME_BUDGET.maxToolCallsPerRequest, 8);
  assert.equal(IVY_RUNTIME_BUDGET.maxTotalModelCallsPerIvyRequest, 16);
  assert.equal(IVY_RUNTIME_BUDGET.maxTotalOutputTokensPerIvyRequest, 21600);
  assert.equal(IVY_RUNTIME_BUDGET.maxTotalToolCallsPerIvyRequest, 20);
  assert.equal(IVY_RUNTIME_BUDGET.maxModelCallsPerRequest, 4);
  assert.equal(IVY_RUNTIME_BUDGET.maxOutputTokensPerCall * IVY_RUNTIME_BUDGET.maxModelCallsPerRequest, IVY_RUNTIME_BUDGET.maxOutputTokensPerRequest);
  assert.equal(IVY_RUNTIME_BUDGET.maxExecutionMsPerRequest, 120000);
});

test("specialist and group budgets have hard model-call and tool-call ceilings", () => {
  assert.equal(SPECIALIST_RUNTIME_BUDGET.maxModelCallsPerRun, 4);
  assert.equal(SPECIALIST_RUNTIME_BUDGET.maxToolCallsPerRun, 4);
  assert.equal(SPECIALIST_RUNTIME_BUDGET.maxOutputTokensPerCall * SPECIALIST_RUNTIME_BUDGET.maxModelCallsPerRun, SPECIALIST_RUNTIME_BUDGET.maxOutputTokensPerRun);
  assert.equal(GROUP_RUNTIME_BUDGET.maxOutputTokensPerCall * GROUP_RUNTIME_BUDGET.maxModelCallsPerRequest, GROUP_RUNTIME_BUDGET.maxOutputTokensPerRequest);
});
