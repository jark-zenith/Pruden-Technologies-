const API = "https://api.github.com";
const DEFAULT_REPOS = ["jark-zenith/Pruden-Technologies-"];

function configuredRepos() {
  const raw = process.env.PRUDEN_GITHUB_REPOS || DEFAULT_REPOS.join(",");
  return new Set(raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}
function parseRepo(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.trim())) {
    throw new Error("Repository must use owner/repo format.");
  }
  const repo = value.trim().toLowerCase();
  if (!configuredRepos().has(repo)) throw new Error("That repository is not in Ivy's approved GitHub allowlist.");
  return repo;
}
async function githubRequest(path) {
  const token = process.env.GITHUB_TOKEN || "";
  if (!token) throw new Error("GitHub is not connected. Configure GITHUB_TOKEN in the private server environment.");
  const response = await fetch(API + path, {
    headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("GitHub rejected the token or the token lacks permission.");
    if (response.status === 404) throw new Error("The repository or item was not found, or the token cannot access it.");
    throw new Error("GitHub API request failed with status " + response.status + ".");
  }
  return data;
}
export const ivyGitHubTools = [
  { name: "github_list_repositories", description: "List repositories visible to Ivy's configured GitHub token. Read-only. Use for repository discovery.", input_schema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 30 } }, required: [] } },
  { name: "github_list_pull_requests", description: "List pull requests for a repository in Ivy's allowlist. Read-only. Repository must be owner/repo format.", input_schema: { type: "object", properties: { repository: { type: "string" }, state: { type: "string", enum: ["open","closed","all"] }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["repository"] } },
  { name: "github_get_pull_request", description: "Get details about one pull request in an allowlisted repository. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, number: { type: "integer", minimum: 1 } }, required: ["repository","number"] } },
  { name: "github_list_issues", description: "List issues for an allowlisted repository. Pull requests may also appear in GitHub's issues endpoint; use the PR tool for PR-specific details.", input_schema: { type: "object", properties: { repository: { type: "string" }, state: { type: "string", enum: ["open","closed","all"] }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["repository"] } }
];
export function githubCapabilityStatus() {
  return {
    status: process.env.GITHUB_TOKEN ? "configured_unverified" : "not_connected",
    readOnlyTools: true,
    writeToolsEnabled: false,
    approvedRepositories: [...configuredRepos()]
  };
}
export async function executeIvyGitHubTool(name, input = {}) {
  if (name === "github_list_repositories") {
    const limit = Math.max(1, Math.min(30, Number(input.limit) || 15));
    const repos = await githubRequest("/user/repos?per_page=" + limit + "&sort=updated&affiliation=owner,collaborator,organization_member");
    return repos.map((repo) => ({ full_name: repo.full_name, private: repo.private, default_branch: repo.default_branch, html_url: repo.html_url, updated_at: repo.updated_at, archived: repo.archived }));
  }
  const repository = parseRepo(input.repository);
  if (name === "github_list_pull_requests") {
    const state = ["open","closed","all"].includes(input.state) ? input.state : "open";
    const limit = Math.max(1, Math.min(30, Number(input.limit) || 10));
    const prs = await githubRequest("/repos/" + repository + "/pulls?state=" + state + "&per_page=" + limit + "&sort=updated&direction=desc");
    return prs.map((pr) => ({ number: pr.number, title: pr.title, state: pr.state, draft: pr.draft, html_url: pr.html_url, head: pr.head?.ref, base: pr.base?.ref, updated_at: pr.updated_at, mergeable_state: pr.mergeable_state }));
  }
  if (name === "github_get_pull_request") {
    const number = Number(input.number);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error("Pull request number must be a positive integer.");
    const pr = await githubRequest("/repos/" + repository + "/pulls/" + number);
    return { number: pr.number, title: pr.title, body: String(pr.body || "").slice(0, 8000), state: pr.state, draft: pr.draft, merged: Boolean(pr.merged), mergeable: pr.mergeable, html_url: pr.html_url, head: pr.head?.ref, base: pr.base?.ref, updated_at: pr.updated_at, merge_commit_sha: pr.merge_commit_sha };
  }
  if (name === "github_list_issues") {
    const state = ["open","closed","all"].includes(input.state) ? input.state : "open";
    const limit = Math.max(1, Math.min(30, Number(input.limit) || 10));
    const issues = await githubRequest("/repos/" + repository + "/issues?state=" + state + "&per_page=" + limit + "&sort=updated&direction=desc");
    return issues.filter((item) => !item.pull_request).map((item) => ({ number: item.number, title: item.title, state: item.state, html_url: item.html_url, labels: (item.labels || []).map((label) => label.name), updated_at: item.updated_at }));
  }
  throw new Error("Unsupported GitHub operation.");
}
