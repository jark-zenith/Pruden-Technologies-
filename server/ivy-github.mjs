const API = "https://api.github.com";
const DEFAULT_REPOS = ["jark-zenith/Pruden-Technologies-"];
const MAX_FILE_BYTES = 40 * 1024;
const MAX_WRITE_BYTES = 100 * 1024;
const runtimeCreatedRepos = new Set();

function configuredRepos() {
  const raw = process.env.PRUDEN_GITHUB_REPOS || DEFAULT_REPOS.join(",");
  return new Set(raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}
function configuredWriteRepos() {
  const raw = process.env.PRUDEN_GITHUB_WRITE_REPOS || "";
  return new Set(raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}
function parseRepo(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.trim())) {
    throw new Error("Repository must use owner/repo format.");
  }
  const repo = value.trim().toLowerCase();
  if (!configuredRepos().has(repo) && !runtimeCreatedRepos.has(repo)) throw new Error("That repository is not in Ivy's approved GitHub allowlist. Add it to PRUDEN_GITHUB_REPOS on the private server.");
  return repo;
}
function safePath(value) {
  if (typeof value !== "string" || !value.trim() || value.startsWith("/") || value.split("/").some((part) => !part || part === "." || part === "..") || value.includes("\\") || value.length > 500) {
    throw new Error("Provide a valid repository-relative file path.");
  }
  return value;
}
function boundedLimit(value, fallback = 20, max = 50) {
  return Math.max(1, Math.min(max, Number(value) || fallback));
}
async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN || "";
  if (!token) throw new Error("GitHub is not connected. Configure GITHUB_TOKEN in the private server environment.");
  const response = await fetch(API + path, {
    method: options.method || "GET",
    headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(20000)
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("GitHub rejected the token or the token lacks the required permission for this operation.");
    if (response.status === 404) throw new Error("The repository or item was not found, or the token cannot access it.");
    if (response.status === 409) throw new Error("GitHub reported a conflict. Refresh the branch or file state and retry.");
    if (response.status === 422) throw new Error("GitHub rejected the request (validation or conflict). Check the repository name, branch, file path, and permissions.");
    throw new Error("GitHub API request failed with status " + response.status + ".");
  }
  return data;
}
function parseWriteRepo(value) {
  const repo = parseRepo(value);
  if (!configuredWriteRepos().has(repo) && !runtimeCreatedRepos.has(repo)) throw new Error("Writes are disabled for this repository. Add its exact owner/repo name to PRUDEN_GITHUB_WRITE_REPOS on the private server.");
  return repo;
}
function validBranch(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 240 || value.startsWith("-") || value.includes("..") || value.includes("~") || value.includes("^") || value.includes(":") || value.includes("?") || value.includes("*") || value.includes("[") || value.includes("\\") || value.endsWith("/") || value.endsWith(".") || value.includes("@{")) throw new Error("Provide a valid Git branch name.");
  return value.trim();
}
async function assertFeatureBranch(repository, branch) {
  const meta = await githubRequest("/repos/" + repository);
  if (branch === meta.default_branch) throw new Error("Direct writes to the default branch are disabled. Create a feature branch and open a pull request.");
  const encoded = branch.split("/").map(encodeURIComponent).join("/");
  await githubRequest("/repos/" + repository + "/git/ref/heads/" + encoded);
  return meta;
}
function encodeContentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
export const ivyGitHubTools = [
  { name: "github_list_repositories", description: "List the newest repositories visible to Ivy's configured GitHub token. Read-only. Include created_at, updated_at, pushed_at and GitHub URLs so you can determine whether a repository was created today or merely updated today. Only allowlisted repositories can be inspected further.", input_schema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 30 } }, required: [] } },
  { name: "render_list_services", description: "Read-only inventory of current Render services using RENDER_API_KEY configured on the private server. Returns service name, type, status/suspension, live URL, linked GitHub repo when available, and service creation/update timestamps. Use to verify which projects have Render services and whether a service was created today. If unavailable, report that Render integration is not configured or the API call failed; do not infer current Render state from the workspace snapshot.", input_schema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100 } }, required: [] } },
  { name: "github_get_repository", description: "Read repository metadata, description, default branch, visibility, language, size, archive status and timestamps for an allowlisted repository.", input_schema: { type: "object", properties: { repository: { type: "string" } }, required: ["repository"] } },
  { name: "github_list_repository_branches", description: "List branches and their latest commit SHAs for an allowlisted repository. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } }, required: ["repository"] } },
  { name: "github_list_repository_commits", description: "List recent commits and messages for an allowlisted repository, optionally filtered by branch or ref. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, ref: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["repository"] } },
  { name: "github_get_repository_tree", description: "Inspect the directory/file tree of an allowlisted repository at a branch, tag, or commit. Returns up to 100 entries; use github_read_repository_file to read file contents. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, ref: { type: "string" } }, required: ["repository"] } },
  { name: "github_read_repository_file", description: "Read a text file from an allowlisted repository at a branch, tag, or commit. Only reads files up to 40 KB. Binary/unsupported files are not returned. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, path: { type: "string" }, ref: { type: "string" } }, required: ["repository", "path"] } },
  { name: "github_list_pull_requests", description: "List pull requests for a repository in Ivy's allowlist. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, state: { type: "string", enum: ["open","closed","all"] }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["repository"] } },
  { name: "github_get_pull_request", description: "Get details about one pull request in an allowlisted repository. Read-only.", input_schema: { type: "object", properties: { repository: { type: "string" }, number: { type: "integer", minimum: 1 } }, required: ["repository","number"] } },
  { name: "github_list_issues", description: "List issues for an allowlisted repository. Pull requests may also appear in GitHub's issues endpoint; use the PR tool for PR-specific details.", input_schema: { type: "object", properties: { repository: { type: "string" }, state: { type: "string", enum: ["open","closed","all"] }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["repository"] } },
  { name: "github_create_repository", description: "Create a repository under the authenticated GitHub user account. Enabled only when PRUDEN_GITHUB_CREATE_REPOSITORIES=true. Defaults to private and auto-initializes a README. Add new repositories to PRUDEN_GITHUB_REPOS and PRUDEN_GITHUB_WRITE_REPOS for durable access after a server restart.", input_schema: { type: "object", properties: { name: { type: "string", minLength: 1, maxLength: 100 }, description: { type: "string", maxLength: 350 }, private: { type: "boolean" }, auto_init: { type: "boolean" } }, required: ["name"] } },
  { name: "github_create_branch", description: "Create a feature branch in a repository explicitly allowlisted for writes. Defaults to the repository default branch. Never writes directly to the default branch.", input_schema: { type: "object", properties: { repository: { type: "string" }, branch: { type: "string" }, base_ref: { type: "string" } }, required: ["repository", "branch"] } },
  { name: "github_create_repository_file", description: "Create a new UTF-8 text file and commit it to an existing non-default feature branch in a write-allowlisted repository. Maximum content 100 KB. Will not overwrite an existing file.", input_schema: { type: "object", properties: { repository: { type: "string" }, branch: { type: "string" }, path: { type: "string" }, content: { type: "string" }, message: { type: "string", maxLength: 200 } }, required: ["repository","branch","path","content","message"] } },
  { name: "github_update_repository_file", description: "Update an existing UTF-8 text file on an existing non-default feature branch in a write-allowlisted repository. Requires the current file SHA to prevent accidental overwrites. Maximum content 100 KB.", input_schema: { type: "object", properties: { repository: { type: "string" }, branch: { type: "string" }, path: { type: "string" }, content: { type: "string" }, sha: { type: "string" }, message: { type: "string", maxLength: 200 } }, required: ["repository","branch","path","content","sha","message"] } },
  { name: "github_create_pull_request", description: "Open a pull request from a feature branch to the repository default branch in a write-allowlisted repository. Does not merge the pull request.", input_schema: { type: "object", properties: { repository: { type: "string" }, title: { type: "string", minLength: 1, maxLength: 250 }, body: { type: "string", maxLength: 10000 }, head: { type: "string" }, draft: { type: "boolean" } }, required: ["repository","title","head"] } }
];
export function githubCapabilityStatus() {
  const writeRepos = [...configuredWriteRepos()];
  const tokenConfigured = Boolean(process.env.GITHUB_TOKEN);
  const writeToolsEnabled = tokenConfigured && (writeRepos.length > 0 || runtimeCreatedRepos.size > 0);
  return {
    status: tokenConfigured ? "configured_unverified" : "not_connected",
    readOnlyTools: !writeToolsEnabled,
    writeToolsEnabled,
    repositoryCreationEnabled: tokenConfigured && process.env.PRUDEN_GITHUB_CREATE_REPOSITORIES === "true",
    approvedRepositories: [...new Set([...configuredRepos(), ...runtimeCreatedRepos])],
    writeApprovedRepositories: [...new Set([...writeRepos, ...runtimeCreatedRepos])]
  };
}
export async function executeIvyGitHubTool(name, input = {}) {
  if (name === "github_create_repository") {
    if (process.env.PRUDEN_GITHUB_CREATE_REPOSITORIES !== "true") throw new Error("Repository creation is disabled. Set PRUDEN_GITHUB_CREATE_REPOSITORIES=true on the private server after confirming token permissions.");
    const nameValue = typeof input.name === "string" ? input.name.trim() : "";
    if (!/^[A-Za-z0-9_.-]{1,100}$/.test(nameValue) || nameValue === "." || nameValue === "..") throw new Error("Repository name must contain only letters, numbers, dots, underscores, and hyphens.");
    const created = await githubRequest("/user/repos", { method: "POST", body: { name: nameValue, description: typeof input.description === "string" ? input.description.slice(0, 350) : "", private: input.private !== false, auto_init: input.auto_init !== false } });
    const fullName = String(created.full_name || "").toLowerCase();
    if (!fullName || !created.owner?.login) throw new Error("GitHub did not return a valid repository identity.");
    runtimeCreatedRepos.add(fullName);
    return { created: true, full_name: created.full_name, html_url: created.html_url, private: created.private, default_branch: created.default_branch, note: "New repository is approved in memory for this server process. Add it to PRUDEN_GITHUB_REPOS and PRUDEN_GITHUB_WRITE_REPOS for durable access after a restart." };
  }
  if (name === "github_list_repositories") {
    const limit = boundedLimit(input.limit, 15, 30);
    const repos = await githubRequest("/user/repos?per_page=" + limit + "&sort=created&direction=desc&affiliation=owner,collaborator,organization_member");
    return repos.map((repo) => ({ full_name: repo.full_name, private: repo.private, description: repo.description, default_branch: repo.default_branch, html_url: repo.html_url, created_at: repo.created_at, updated_at: repo.updated_at, pushed_at: repo.pushed_at, archived: repo.archived }));
  }
  if (name === "render_list_services") {
    const key = process.env.RENDER_API_KEY || "";
    if (!key) throw new Error("Render is not connected to Ivy. Add RENDER_API_KEY to the private Render service environment, then redeploy/restart it. A GitHub Actions secret is not automatically available to the running Ivy service.");
    const limit = boundedLimit(input.limit, 100, 100);
    const response = await fetch("https://api.render.com/v1/services?limit=" + limit, {
      headers: { Accept: "application/json", Authorization: "Bearer " + key },
      signal: AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("Render rejected the configured API key or it lacks service-read access. Check the private server environment without sharing the key.");
      throw new Error("Render services API request failed with status " + response.status + ".");
    }
    const items = Array.isArray(data) ? data : Array.isArray(data.services) ? data.services : [];
    return items.map((item) => {
      const service = item.service || item;
      const details = service.serviceDetails || {};
      return {
        id: service.id || null,
        name: service.name || null,
        type: service.type || null,
        status: service.suspended ? "suspended" : (service.status || details.status || "unknown"),
        suspended: service.suspended || false,
        url: details.url || service.url || null,
        repo_url: service.repo || details.repo || service.repository || null,
        created_at: service.createdAt || service.created_at || null,
        updated_at: service.updatedAt || service.updated_at || null
      };
    });
  }
  }
  if (["github_create_branch", "github_create_repository_file", "github_update_repository_file", "github_create_pull_request"].includes(name)) {
    const repository = parseWriteRepo(input.repository);
    if (name === "github_create_branch") {
      const branch = validBranch(input.branch);
      const meta = await githubRequest("/repos/" + repository);
      if (branch === meta.default_branch) throw new Error("Choose a feature branch name, not the default branch.");
      const baseRef = typeof input.base_ref === "string" && input.base_ref.trim() ? validBranch(input.base_ref) : meta.default_branch;
      const base = await githubRequest("/repos/" + repository + "/git/ref/heads/" + baseRef.split("/").map(encodeURIComponent).join("/"));
      const created = await githubRequest("/repos/" + repository + "/git/refs", { method: "POST", body: { ref: "refs/heads/" + branch, sha: base.object.sha } });
      return { created: true, repository, branch, base_ref: baseRef, commit_sha: created.object?.sha || base.object.sha, html_url: "https://github.com/" + repository + "/tree/" + branch };
    }
    if (name === "github_create_repository_file" || name === "github_update_repository_file") {
      const branch = validBranch(input.branch);
      const filePath = safePath(input.path);
      if (typeof input.content !== "string" || Buffer.byteLength(input.content, "utf8") > MAX_WRITE_BYTES) throw new Error("File content must be text no larger than 100 KB.");
      if (typeof input.message !== "string" || !input.message.trim() || input.message.length > 200) throw new Error("Provide a commit message up to 200 characters.");
      await assertFeatureBranch(repository, branch);
      const url = "/repos/" + repository + "/contents/" + encodeContentPath(filePath);
      if (name === "github_create_repository_file") {
        const created = await githubRequest(url, { method: "PUT", body: { message: input.message.trim(), content: Buffer.from(input.content, "utf8").toString("base64"), branch } });
        return { created: true, repository, path: filePath, branch, commit_sha: created.commit?.sha, html_url: created.content?.html_url };
      }
      if (typeof input.sha !== "string" || !/^[0-9a-f]{40}$/i.test(input.sha)) throw new Error("Provide the current 40-character file SHA from github_read_repository_file before updating.");
      const updated = await githubRequest(url, { method: "PUT", body: { message: input.message.trim(), content: Buffer.from(input.content, "utf8").toString("base64"), branch, sha: input.sha } });
      return { updated: true, repository, path: filePath, branch, commit_sha: updated.commit?.sha, html_url: updated.content?.html_url };
    }
    if (name === "github_create_pull_request") {
      const title = typeof input.title === "string" ? input.title.trim() : "";
      if (!title || title.length > 250) throw new Error("Provide a pull request title up to 250 characters.");
      const head = validBranch(input.head);
      const meta = await githubRequest("/repos/" + repository);
      if (head === meta.default_branch) throw new Error("A pull request must use a feature branch as its head.");
      const pr = await githubRequest("/repos/" + repository + "/pulls", { method: "POST", body: { title, body: typeof input.body === "string" ? input.body.slice(0, 10000) : "", head, base: meta.default_branch, draft: input.draft === true, maintainer_can_modify: true } });
      return { created: true, number: pr.number, title: pr.title, state: pr.state, draft: pr.draft, head: pr.head?.ref, base: pr.base?.ref, html_url: pr.html_url, merged: Boolean(pr.merged) };
    }
  }
  const repository = parseRepo(input.repository);
  if (name === "github_get_repository") {
    const repo = await githubRequest("/repos/" + repository);
    return { full_name: repo.full_name, description: repo.description, private: repo.private, visibility: repo.visibility, default_branch: repo.default_branch, language: repo.language, size_kb: repo.size, archived: repo.archived, fork: repo.fork, html_url: repo.html_url, created_at: repo.created_at, updated_at: repo.updated_at, pushed_at: repo.pushed_at, open_issues_count: repo.open_issues_count };
  }
  if (name === "github_list_repository_branches") {
    const branches = await githubRequest("/repos/" + repository + "/branches?per_page=" + boundedLimit(input.limit, 30, 50));
    return branches.map((branch) => ({ name: branch.name, protected: branch.protected, commit_sha: branch.commit?.sha }));
  }
  if (name === "github_list_repository_commits") {
    const params = new URLSearchParams({ per_page: String(boundedLimit(input.limit, 10, 30)) });
    if (typeof input.ref === "string" && input.ref.trim()) params.set("sha", input.ref.trim().slice(0, 250));
    const commits = await githubRequest("/repos/" + repository + "/commits?" + params.toString());
    return commits.map((item) => ({ sha: item.sha, message: String(item.commit?.message || "").slice(0, 1000), author: item.commit?.author?.name || item.author?.login || null, date: item.commit?.author?.date || null, html_url: item.html_url }));
  }
  if (name === "github_get_repository_tree") {
    const meta = await githubRequest("/repos/" + repository);
    const ref = typeof input.ref === "string" && input.ref.trim() ? input.ref.trim() : meta.default_branch;
    const tree = await githubRequest("/repos/" + repository + "/git/trees/" + encodeURIComponent(ref) + "?recursive=1");
    return { repository, ref, truncated: Boolean(tree.truncated), count_returned: Math.min(100, (tree.tree || []).length), entries: (tree.tree || []).slice(0, 100).map((item) => ({ path: item.path, type: item.type, size: item.size ?? null, sha: item.sha })) };
  }
  if (name === "github_read_repository_file") {
    const path = safePath(input.path);
    const ref = typeof input.ref === "string" && input.ref.trim() ? input.ref.trim().slice(0, 250) : undefined;
    const query = ref ? "?ref=" + encodeURIComponent(ref) : "";
    const file = await githubRequest("/repos/" + repository + "/contents/" + path.split("/").map(encodeURIComponent).join("/") + query);
    if (Array.isArray(file) || file.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") throw new Error("That path is not a supported text file.");
    if (Number(file.size) > MAX_FILE_BYTES) throw new Error("That file is larger than Ivy's 40 KB read limit.");
    const content = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
    if (content.includes("\u0000")) throw new Error("Binary files are not supported.");
    return { repository, path, ref: ref || null, size_bytes: Number(file.size) || Buffer.byteLength(content), html_url: file.html_url, content: content.slice(0, MAX_FILE_BYTES) };
  }
  if (name === "github_list_pull_requests") {
    const state = ["open","closed","all"].includes(input.state) ? input.state : "open";
    const prs = await githubRequest("/repos/" + repository + "/pulls?state=" + state + "&per_page=" + boundedLimit(input.limit, 10, 30) + "&sort=updated&direction=desc");
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
    const issues = await githubRequest("/repos/" + repository + "/issues?state=" + state + "&per_page=" + boundedLimit(input.limit, 10, 30) + "&sort=updated&direction=desc");
    return issues.filter((item) => !item.pull_request).map((item) => ({ number: item.number, title: item.title, state: item.state, html_url: item.html_url, labels: (item.labels || []).map((label) => label.name), updated_at: item.updated_at }));
  }
  throw new Error("Unsupported GitHub operation.");
}
