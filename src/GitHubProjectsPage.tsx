import { useMemo, useState } from "react";
import { ExternalLink, Github, Globe, Search, Shield, Archive, Eye, ArrowRight } from "lucide-react";
import { githubProjects, type GitHubProject } from "./githubProjects";

type Filter = "All" | "Live URL" | "No live URL" | "Public" | "Private";

export default function GitHubProjectsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [previews, setPreviews] = useState(true);
  const [selectedProject, setSelectedProject] = useState<GitHubProject | null>(null);
  const [detailTab, setDetailTab] = useState<"Overview" | "Analytics" | "Users" | "Activity" | "Infrastructure" | "Deployments" | "Settings">("Overview");

  const filtered = useMemo(() => githubProjects
    .filter((project) => {
      const matchesQuery = project.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "All"
        || (filter === "Live URL" && Boolean(project.deploymentUrl))
        || (filter === "No live URL" && !project.deploymentUrl)
        || (filter === "Public" && project.visibility === "public")
        || (filter === "Private" && project.visibility === "private");
      return matchesQuery && matchesFilter;
    })
    .sort((a, b) => Number(Boolean(b.deploymentUrl)) - Number(Boolean(a.deploymentUrl)) || a.name.localeCompare(b.name)),
    [query, filter],
  );

  const liveCount = githubProjects.filter((project) => project.deploymentUrl).length;
  const privateCount = githubProjects.filter((project) => project.visibility === "private").length;


  if (selectedProject) {
    const project = selectedProject;
    const deployments = project.deploymentServices?.length
      ? project.deploymentServices
      : project.deploymentUrl
        ? [{ name: project.deploymentName || project.name, url: project.deploymentUrl, type: project.deploymentType || "unknown", branch: project.deploymentBranch, serviceId: null, suspended: "unknown" }]
        : [];
    const tabs = ["Overview", "Analytics", "Users", "Activity", "Infrastructure", "Deployments", "Settings"] as const;
    const sourceStatus = (connected: boolean) => connected ? "Configured" : "Not connected";
    return <section className="module-page github-directory project-operations-detail">
      <div className="module-title-row">
        <div>
          <p className="eyebrow"><Github size={13} /> PROJECT OPERATIONS / {project.name.toUpperCase()}</p>
          <h1>{project.name}</h1>
          <p className="welcome-subtitle">Project control center. Only verified repository and configured deployment metadata is shown; analytics and user metrics appear when their integrations are connected.</p>
        </div>
        <button className="secondary-button" onClick={() => setSelectedProject(null)}>← Back to all projects</button>
      </div>
      <div className="github-project-detail-summary">
        <article className="github-summary-card"><span>Repository</span><strong>{project.archived ? "Archived" : "Available"}</strong><small><a href={project.repoUrl} target="_blank" rel="noreferrer">{project.repoUrl}</a></small></article>
        <article className="github-summary-card"><span>Deployment records</span><strong>{deployments.length}</strong><small>Configured services; uptime not yet checked</small></article>
        <article className="github-summary-card"><span>Visitor analytics</span><strong>Not connected</strong><small>No visitor totals are fabricated</small></article>
        <article className="github-summary-card"><span>User data</span><strong>Not connected</strong><small>Requires authorized project backend integration</small></article>
      </div>
      <div className="github-filters project-detail-tabs" role="tablist" aria-label="Project detail sections">
        {tabs.map((tab) => <button key={tab} role="tab" aria-selected={detailTab === tab} className={detailTab === tab ? "selected" : ""} onClick={() => setDetailTab(tab)}>{tab}</button>)}
      </div>
      {detailTab === "Overview" && <div className="github-project-detail-grid">
        <article className="github-project-detail-panel"><h2>Project identity</h2><dl><dt>Repository</dt><dd><a href={project.repoUrl} target="_blank" rel="noreferrer">{project.repoUrl}</a></dd><dt>Default branch</dt><dd><code>{project.defaultBranch}</code></dd><dt>Visibility</dt><dd>{project.visibility}</dd><dt>Archive status</dt><dd>{project.archived ? "Archived" : "Not archived"}</dd></dl></article>
        <article className="github-project-detail-panel"><h2>Integration readiness</h2><ul><li>GitHub repository: {sourceStatus(Boolean(project.repoUrl))}</li><li>Render deployment mapping: {sourceStatus(deployments.length > 0)}</li><li>Visitor analytics: Not connected</li><li>Registered-user data: Not connected</li><li>Infrastructure telemetry: Not connected to this dashboard</li></ul></article>
      </div>}
      {detailTab === "Analytics" && <article className="github-project-detail-panel"><h2>Visitor analytics</h2><p>No analytics provider is connected to this project in the management dashboard yet.</p><p>Once configured, this section will show visitors, page views, referral sources, popular pages, device categories and date-range comparisons.</p><p><strong>Data status:</strong> Not connected — no metrics available.</p></article>}
      {detailTab === "Users" && <article className="github-project-detail-panel"><h2>Registered users</h2><p>User data must come from this project's authorized authentication system or backend.</p><p><strong>Data status:</strong> Not connected — no account totals or personal records are displayed.</p><p>Planned: total accounts, new registrations, account status and role aggregates, subject to the project's schema and access policies.</p></article>}
      {detailTab === "Activity" && <article className="github-project-detail-panel"><h2>Project activity</h2><p>No application event stream is connected yet.</p><p>Planned event sources: registrations, product activity, payment/order events, integration failures and administrative audit events. Sensitive personal data will be excluded by default.</p></article>}
      {detailTab === "Infrastructure" && <article className="github-project-detail-panel"><h2>Infrastructure health</h2><p>Configured deployment URLs are listed, but this dashboard has not yet verified uptime or retrieved service metrics for this project.</p><p>Planned: uptime checks, response latency, HTTP errors, resource usage and database/storage status where supported by the provider.</p></article>}
      {detailTab === "Deployments" && <div className="github-project-grid">
        {deployments.length ? deployments.map((service) => <article className="github-project-card" key={service.serviceId || service.name + service.url}><div className="github-project-content"><div className="github-project-heading"><h2>{service.name}</h2><span className="deployment-label configured"><i /> URL CONFIGURED</span></div><p className="github-project-meta">Type: <code>{service.type}</code>{service.branch ? <> · Branch: <code>{service.branch}</code></> : null}</p><p className="github-project-meta">Service state: {service.suspended === "not_suspended" ? "Not suspended (not an uptime guarantee)" : "Not verified in this view"}</p><div className="github-project-actions"><a href={service.url} target="_blank" rel="noreferrer"><Globe size={14} /> Open deployment <ExternalLink size={12} /></a>{service.serviceId && <span>Render ID: <code>{service.serviceId}</code></span>}</div></div></article>) : <article className="github-project-detail-panel"><h2>No deployment mapped</h2><p>This repository is registered, but no matching Render service URL is configured in the inventory.</p></article>}
      </div>}
      {detailTab === "Settings" && <article className="github-project-detail-panel"><h2>Project integration settings</h2><p>Provider connections and credentials will be configured server-side after the project inventory is reconciled.</p><ul><li>Repository URL and default branch are read from the inventory.</li><li>Analytics: not connected.</li><li>User backend: not connected.</li><li>Infrastructure API: not connected to this dashboard.</li></ul><p>Secrets must never be stored in this client-side project record.</p></article>}
      <footer className="footer-note"><span>PRUDEN COMMAND · PROJECT OPERATIONS</span><span>Data sources clearly marked; no placeholder metrics presented as real.</span></footer>
    </section>;
  }

  return <section className="module-page github-directory">
    <div className="module-title-row">
      <div>
        <p className="eyebrow"><Github size={13} /> REPOSITORY DIRECTORY / CONNECTED ACCOUNT</p>
        <h1>GitHub projects</h1>
        <p className="welcome-subtitle">Deployed projects are listed first, followed by repositories without a configured deployment URL. Open a repository or visit its live site from here.</p>
      </div>
      <a className="primary-button github-account-link" href="https://github.com/jark-zenith" target="_blank" rel="noreferrer"><Github size={15} /> GitHub account <ExternalLink size={13} /></a>
    </div>

    <div className="github-summary-grid">
      <article className="github-summary-card"><span>Repositories listed</span><strong>{githubProjects.length}</strong><small>Visible to the connected GitHub account</small></article>
      <article className="github-summary-card"><span>Deployment URLs linked</span><strong>{liveCount}</strong><small>Matched from the Render workspace</small></article>
      <article className="github-summary-card"><span>Private repositories</span><strong>{privateCount}</strong><small>Repository links require permission</small></article>
    </div>

    <div className="github-toolbar">
      <label className="github-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories..." aria-label="Search repositories" /></label>
      <div className="github-filters" role="group" aria-label="Filter projects">
        {(["All", "Live URL", "No live URL", "Public", "Private"] as Filter[]).map((option) =>
          <button key={option} className={filter === option ? "selected" : ""} onClick={() => setFilter(option)}>{option}</button>
        )}
      </div>
      <button className="secondary-button preview-toggle" onClick={() => setPreviews((value) => !value)}><Eye size={14} /> {previews ? "Hide previews" : "Show previews"}</button>
    </div>

    <p className="github-results-line">Showing <strong>{filtered.length}</strong> of {githubProjects.length} repositories <span className="sort-note">· Deployed projects first</span></p>
    <div className="github-project-grid">
      {filtered.map((project) => <article className="github-project-card" key={project.repoUrl}>
        <div className="github-project-preview">
          {previews && project.deploymentUrl
            ? <iframe src={project.deploymentUrl} title={project.name + " live-site preview"} loading="lazy" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
            : <div className="github-preview-empty"><span className="github-preview-icon">{project.deploymentUrl ? <Eye size={24} /> : <Github size={28} />}</span><strong>{project.deploymentUrl ? "Preview hidden" : "No deployment linked"}</strong><small>{project.deploymentUrl ? "Enable previews to load the site" : "A live URL has not been matched in Render"}</small></div>}
          <span className={project.deploymentUrl ? "deployment-label configured" : "deployment-label not-configured"}><i />{project.deploymentUrl ? "LIVE URL CONFIGURED" : "NO LIVE URL"}</span>
        </div>
        <div className="github-project-content">
          <div className="github-project-heading"><h2>{project.name}</h2><span className={"visibility-label " + project.visibility}><Shield size={11} />{project.visibility}</span></div>
          <p className="github-project-meta">{project.archived ? <><Archive size={12} /> Archived repository</> : <>Branch: <code>{project.defaultBranch}</code></>}</p>
          {project.deploymentName && <p className="github-service-name">Render service: {project.deploymentName}</p>}
          <div className="github-project-actions">
            <a href={project.repoUrl} target="_blank" rel="noreferrer"><Github size={14} /> Repository <ExternalLink size={12} /></a>
            <button type="button" onClick={() => { setSelectedProject(project); setDetailTab("Overview"); }}><Eye size={14} /> Project details <ArrowRightPlaceholder /></button>
            {project.deploymentUrl && <a href={project.deploymentUrl} target="_blank" rel="noreferrer"><Globe size={14} /> Open live site <ExternalLink size={12} /></a>}
          </div>
          {project.deploymentUrl && <p className="github-preview-note">URL is configured in Render. This label does not guarantee current uptime; some sites block embedded previews.</p>}
        </div>
      </article>)}
      {filtered.length === 0 && <div className="github-empty-state"><Github size={25} /><strong>No repositories match</strong><p>Try a different name or filter.</p></div>}
    </div>
    <footer className="footer-note"><span>PRUDEN COMMAND <b>·</b> REPOSITORY DIRECTORY</span><span><Globe size={12} /> {liveCount} configured deployment URLs</span></footer>
  </section>;
}
