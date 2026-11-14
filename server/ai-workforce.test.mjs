import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allowedGitHubToolNames, availableToolNamesForAgent, buildClaudeResponseResult, createUnverifiedWorkforceResponseState } from "./ai-workforce.mjs";

const readOnlyControls = { toolsEnabled: true, externalActionsEnabled: false };
const writeEnabledControls = { toolsEnabled: true, externalActionsEnabled: true };
const allAgentIds = ["ivy", "atlas", "nova", "echo", "mira", "forge", "pixel", "stack", "vector", "sentinel", "lumi", "motion", "relay", "vault"];

test("Ivy's role policy includes read, controlled write, and repository creation tools", () => {
  const tools = allowedGitHubToolNames("ivy");
  assert.ok(tools.has("github_list_repositories"));
  assert.ok(tools.has("github_create_branch"));
  assert.ok(tools.has("github_create_repository_file"));
  assert.ok(tools.has("github_create_pull_request"));
  assert.ok(tools.has("github_create_repository"));
});

test("Forge's role policy includes engineering writes and repository creation", () => {
  const tools = allowedGitHubToolNames("forge");
  assert.ok(tools.has("github_create_branch"));
  assert.ok(tools.has("github_update_repository_file"));
  assert.ok(tools.has("github_create_pull_request"));
  assert.ok(tools.has("github_create_repository"));
});

test("specialist engineers can create PRs but cannot create repositories", () => {
  for (const agentId of ["pixel", "stack", "vector"]) {
    const tools = allowedGitHubToolNames(agentId);
    assert.ok(tools.has("github_read_repository_file"), agentId);
    assert.ok(tools.has("github_create_branch"), agentId);
    assert.ok(tools.has("github_create_pull_request"), agentId);
    assert.ok(!tools.has("github_create_repository"), agentId);
  }
});

test("Sentinel's role policy is limited to read-only repository inspection", () => {
  const tools = allowedGitHubToolNames("sentinel");
  assert.ok(tools.has("github_read_repository_file"));
  assert.ok(tools.has("github_get_pull_request"));
  assert.ok(!tools.has("github_create_branch"));
  assert.ok(!tools.has("github_update_repository_file"));
  assert.ok(!tools.has("github_create_pull_request"));
  assert.ok(!tools.has("github_create_repository"));
});

test("business, research, creative, and operations agents do not receive GitHub write grants", () => {
  for (const agentId of ["atlas", "nova", "echo", "mira", "lumi", "motion", "relay", "vault"]) {
    const tools = allowedGitHubToolNames(agentId);
    assert.equal(tools.size, 0, agentId);
  }
});

test("unknown agent IDs fail closed", () => {
  assert.equal(allowedGitHubToolNames("unexpected-agent").size, 0);
});

test("the registry-wide toolsEnabled switch disables all specialist and group tools by default", () => {
  for (const agentId of [...allAgentIds, "group"]) {
    assert.equal(availableToolNamesForAgent(agentId, { toolsEnabled: false, externalActionsEnabled: true }).size, 0, agentId);
  }
});

test("Atlas and Nova receive only their read-only research toolset when tools are enabled", () => {
  const expected = ["research_search_web", "research_open_page", "research_job_sites"];
  for (const agentId of ["atlas", "nova"]) {
    const tools = availableToolNamesForAgent(agentId, readOnlyControls, true);
    for (const name of expected) assert.ok(tools.has(name), agentId + " missing " + name);
    assert.equal(tools.has("github_create_pull_request"), false, agentId + " must not get GitHub writes");
  }
});

test("non-research agents do not receive Tavily research tools", () => {
  for (const agentId of ["ivy", "sentinel", "forge", "echo"]) {
    const tools = availableToolNamesForAgent(agentId, readOnlyControls);
    assert.equal(tools.has("research_search_web"), false, agentId);
  }
});

test("externalActionsEnabled=false strips GitHub writes even when read tools are enabled", () => {
  for (const agentId of ["ivy", "forge", "pixel", "stack", "vector"]) {
    const tools = availableToolNamesForAgent(agentId, readOnlyControls);
    assert.ok(tools.has("github_list_repositories"), agentId);
    assert.ok(!tools.has("github_create_branch"), agentId);
    assert.ok(!tools.has("github_create_pull_request"), agentId);
    assert.ok(!tools.has("github_create_repository"), agentId);
  }
  const sentinel = availableToolNamesForAgent("sentinel", readOnlyControls);
  assert.ok(sentinel.has("github_get_pull_request"));
  assert.ok(!sentinel.has("github_create_branch"));
});

test("externalActionsEnabled=true still grants writes only to the approved engineering roles", () => {
  const forge = availableToolNamesForAgent("forge", writeEnabledControls);
  assert.ok(forge.has("github_create_branch"));
  assert.ok(forge.has("github_create_repository"));
  for (const agentId of ["pixel", "stack", "vector"]) {
    const tools = availableToolNamesForAgent(agentId, writeEnabledControls);
    assert.ok(tools.has("github_create_pull_request"), agentId);
    assert.ok(!tools.has("github_create_repository"), agentId);
  }
  const sentinel = availableToolNamesForAgent("sentinel", writeEnabledControls);
  assert.ok(sentinel.has("github_get_pull_request"));
  assert.ok(!sentinel.has("github_create_branch"));
});

test("group chat remains read-only even when external actions are enabled", () => {
  const tools = availableToolNamesForAgent("group", writeEnabledControls);
  assert.ok(tools.has("github_list_repositories"));
  assert.ok(!tools.has("github_create_branch"));
  assert.ok(!tools.has("github_create_pull_request"));
});

test("Atlas and Nova do not receive research tools when Tavily is not configured", () => {
  for (const agentId of ["atlas", "nova"]) {
    const tools = availableToolNamesForAgent(agentId, readOnlyControls, false);
    assert.equal(tools.size, 0, agentId);
  }
});

test("the global tools switch still disables research even when Tavily is configured", () => {
  for (const agentId of ["atlas", "nova"]) {
    const tools = availableToolNamesForAgent(agentId, { toolsEnabled: false, externalActionsEnabled: false }, true);
    assert.equal(tools.size, 0, agentId);
  }
});

test("a model response is not represented as a completed or verified mission", () => {
  assert.deepEqual(createUnverifiedWorkforceResponseState(), {
    status: "response_ready",
    completionKind: "agent_response_only",
    missionStatus: "not_created",
    verificationStatus: "not_performed"
  });
});


test("Anthropic text responses remain normal unverified model responses", () => {
  const result = buildClaudeResponseResult({
    response: { stop_reason: "end_turn", content: [{ type: "text", text: "Evidence summary." }], usage: { input_tokens: 12, output_tokens: 8 } }
  });
  assert.equal(result.output, "Evidence summary.");
  assert.equal(result.responseKind, "model_text");
  assert.equal(result.partial, false);
  assert.deepEqual(result.toolSummary, { attempted: 0, succeeded: 0, failed: 0, denied: 0 });
});

test("tool-only Anthropic responses return partial status instead of a false provider failure", () => {
  const result = buildClaudeResponseResult({
    response: { stop_reason: "tool_use", content: [{ type: "tool_use", id: "tool-1", name: "research_search_web", input: { query: "private query must not be echoed" } }] },
    toolCalls: 1,
    successfulToolCalls: 1
  });
  assert.equal(result.responseKind, "tool_only_without_final_text");
  assert.equal(result.partial, true);
  assert.match(result.output, /1 authorized tool call\(s\) succeeded/);
  assert.match(result.output, /no mission was created or independently verified/i);
  assert.doesNotMatch(result.output, /private query must not be echoed/);
  assert.deepEqual(result.toolSummary, { attempted: 1, succeeded: 1, failed: 0, denied: 0 });
});

test("tool-only responses preserve denied and failed tool counts without claiming success", () => {
  const result = buildClaudeResponseResult({
    response: { stop_reason: "tool_use", content: [{ type: "tool_use", id: "tool-2", name: "github_create_pull_request", input: {} }] },
    failedToolCalls: 1,
    deniedToolCalls: 1
  });
  assert.equal(result.partial, true);
  assert.equal(result.toolSummary.succeeded, 0);
  assert.equal(result.toolSummary.failed, 1);
  assert.equal(result.toolSummary.denied, 1);
  assert.match(result.output, /1 authorized tool call\(s\) failed/);
  assert.match(result.output, /1 tool call\(s\) were denied/);
});

test("empty Anthropic responses with no tool activity remain provider failures", () => {
  assert.throws(
    () => buildClaudeResponseResult({ response: { stop_reason: "end_turn", content: [] } }),
    error => error.statusCode === 502 && /no text output and no tool execution result/.test(error.message)
  );
});

test("budget-limited empty responses remain partial and identify the budget boundary", () => {
  const result = buildClaudeResponseResult({
    response: { stop_reason: "max_tokens", content: [] },
    budgetStopReason: "The output-token budget was reached."
  });
  assert.equal(result.responseKind, "budget_limited");
  assert.equal(result.partial, true);
  assert.match(result.output, /output-token budget was reached/i);
});

const taskStatusMigration = await readFile(
  new URL("../supabase/migrations/20261113204800_allow_awaiting_verification_task_status.sql", import.meta.url),
  "utf8"
);

test("task status migration preserves existing states and adds awaiting_verification", () => {
  assert.match(taskStatusMigration, /drop constraint if exists pruden_tasks_status_check/i);
  assert.match(taskStatusMigration, /add constraint pruden_tasks_status_check/i);
  for (const status of ["planned", "in_progress", "blocked", "completed", "cancelled", "awaiting_verification"]) {
    assert.ok(taskStatusMigration.includes("'" + status + "'"), "missing task status: " + status);
  }
  for (const forbidden of ["drop table", "delete from", "truncate"]) {
    assert.equal(taskStatusMigration.toLowerCase().includes(forbidden), false, "unexpected destructive statement: " + forbidden);
  }
});
