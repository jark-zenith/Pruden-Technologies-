import { writeFile } from "node:fs/promises";

const owner = "jark-zenith";
const githubToken = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN;
const renderToken = process.env.RENDER_API_KEY;

if (!githubToken) throw new Error("Missing GH_SYNC_TOKEN (needs read access to all owner repositories).");
if (!renderToken) throw new Error("Missing RENDER_API_KEY (read access to Render services).");

async function getJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

const ghHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${githubToken}`,
  "X-GitHub-Api-Version": "2022-11-28",
};
const githubRepos = [];
for (let page = 1; ; page++) {
  const batch = await getJson(`https://api.github.com/users/${owner}/repos?per_page=100&page=${page}&type=owner&sort=updated`, ghHeaders);
  githubRepos.push(...batch);
  if (batch.length < 100) break;
}

const renderServices = [];
for (let cursor = ""; ; ) {
  const query = new URLSearchParams({ limit: "100" });
  if (cursor) query.set("cursor", cursor);
  const payload = await getJson(`https://api.render.com/v1/services?${query}`, {
    Accept: "application/json",
    Authorization: `Bearer ${renderToken}`,
  });
  const rows = Array.isArray(payload) ? payload : (payload.services || payload.data || []);
  renderServices.push(...rows.map((row) => row.service || row));
  const next = payload.cursor || payload.nextCursor || payload.next_cursor;
  if (!next || rows.length === 0 || rows.length < 100) break;
  cursor = String(next);
}

const normalized = renderServices.map((service) => ({
  name: service.name,
  repoUrl: service.repo || service.repository || null,
  url: service.serviceDetails?.url || service.url || null,
  type: service.type || service.serviceDetails?.runtime || "unknown",
  branch: service.branch || service.serviceDetails?.branch || null,
  id: service.id || null,
  suspended: service.suspended || "unknown",
})).filter((service) => service.repoUrl);

const projects = githubRepos
  .filter((repo) => !repo.fork || repo.owner?.login === owner)
  .map((repo) => {
    const repoUrl = repo.html_url;
    const services = normalized.filter((service) => {
      try {
        return new URL(service.repoUrl).pathname.replace(/\\.git$/, "").toLowerCase() ===
          new URL(repoUrl).pathname.toLowerCase();
      } catch {
        return service.repoUrl.replace(/\\.git$/, "").toLowerCase() === repo.clone_url.replace(/\\.git$/, "").toLowerCase();
      }
    }).filter((service) => service.url).sort((a, b) => {
      const priority = (item) => item.type === "static_site" ? 0 : item.type === "web_service" ? 1 : 2;
      return priority(a) - priority(b) || a.name.localeCompare(b.name);
    });
    const primary = services[0] || null;
    return {
      name: repo.name,
      repoUrl,
      visibility: repo.private ? "private" : "public",
      archived: Boolean(repo.archived),
      defaultBranch: repo.default_branch || "main",
      deploymentUrl: primary?.url || null,
      deploymentName: primary?.name || null,
      deploymentType: primary?.type || null,
      deploymentBranch: primary?.branch || null,
      deploymentServices: services.map(({ name, url, type, branch, id, suspended }) => ({
        name, url, type, branch, serviceId: id, suspended,
      })),
    };
  })
  .sort((a, b) => Number(Boolean(b.deploymentUrl)) - Number(Boolean(a.deploymentUrl)) || a.name.localeCompare(b.name));

const source = `export type DeploymentService = {
  name: string;
  url: string;
  type: string;
  branch: string | null;
  serviceId: string | null;
  suspended: string;
};

export type GitHubProject = {
  name: string;
  repoUrl: string;
  visibility: string;
  archived: boolean;
  defaultBranch: string;
  deploymentUrl: string | null;
  deploymentName: string | null;
  deploymentType: string | null;
  deploymentBranch: string | null;
  deploymentServices?: DeploymentService[];
};

// Generated from the connected GitHub owner account and Render workspace.
// URLs are configured deployments, not an uptime guarantee. Do not hand-edit; run the sync workflow.
export const githubProjects: GitHubProject[] = ${JSON.stringify(projects, null, 2)};
`;

await writeFile("src/githubProjects.ts", source, "utf8");
console.log(`Synced ${projects.length} GitHub repositories and ${normalized.length} Render services.`);
console.log(`Repositories with at least one mapped deployment: ${projects.filter((project) => project.deploymentServices?.length).length}.`);
