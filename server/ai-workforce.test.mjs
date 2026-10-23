import test from "node:test";
import assert from "node:assert/strict";
import { allowedGitHubToolNames, availableToolNamesForAgent } from "./ai-workforce.mjs";

test("Ivy receives read, controlled write, and repository creation tools", () => {
  const tools = allowedGitHubToolNames("ivy");
  assert.ok(tools.has("github_list_repositories"));
  assert.ok(tools.has("github_create_branch"));
  assert.ok(tools.has("github_create_repository_file"));
  assert.ok(tools.has("github_create_pull_request"));
  assert.ok(tools.has("github_create_repository"));
});

test("Forge receives engineering write tools and repository creation", () => {
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

test("Sentinel is limited to read-only repository inspection", () => {
  const tools = allowedGitHubToolNames("sentinel");
  assert.ok(tools.has("github_read_repository_file"));
  assert.ok(tools.has("github_get_pull_request"));
  assert.ok(!tools.has("github_create_branch"));
  assert.ok(!tools.has("github_update_repository_file"));
  assert.ok(!tools.has("github_create_pull_request"));
  assert.ok(!tools.has("github_create_repository"));
});

test("business, research, creative, and operations agents do not receive GitHub write tools", () => {
  for (const agentId of ["atlas", "nova", "echo", "mira", "lumi", "motion", "relay", "vault"]) {
    const tools = allowedGitHubToolNames(agentId);
    assert.equal(tools.size, 0, agentId);
  }
});

test("unknown agent IDs fail closed", () => {
  assert.equal(allowedGitHubToolNames("unexpected-agent").size, 0);
});


test("Atlas and Nova receive the read-only research toolset", () => {
  const expected = ["research_search_web", "research_open_page", "research_job_sites"];
  for (const agentId of ["atlas", "nova"]) {
    const tools = availableToolNamesForAgent(agentId);
    for (const name of expected) assert.ok(tools.has(name), agentId + " missing " + name);
    assert.equal(tools.has("github_create_pull_request"), false, agentId + " must not get GitHub writes");
  }
});
test("non-research agents do not receive Tavily research tools", () => {
  for (const agentId of ["ivy", "sentinel", "forge", "echo"]) {
    const tools = availableToolNamesForAgent(agentId);
    assert.equal(tools.has("research_search_web"), false, agentId);
  }
});
