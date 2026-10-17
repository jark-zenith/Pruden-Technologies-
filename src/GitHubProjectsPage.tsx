import { useMemo, useState } from "react";
import { ExternalLink, Github, Globe, Search, Shield, Archive, Eye } from "lucide-react";
import { githubProjects } from "./githubProjects";

type Filter = "All" | "Live URL" | "No live URL" | "Public" | "Private";

export default function GitHubProjectsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [previews, setPreviews] = useState(true);

  const filtered = useMemo(() => githubProjects.filter((project) => {
    const matchesQuery = project.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All"
      || (filter === "Live URL" && Boolean(project.deploymentUrl))
      || (filter === "No live URL" && !project.deploymentUrl)
      || (filter === "Public" && project.visibility === "public")
      || (filter === "Private" && project.visibility === "private");
    return matchesQuery && matchesFilter;
  }), [query, filter]);

  const liveCount = githubProjects.filter((project) => project.deploymentUrl).length;
  const privateCount = githubProjects.filter((project) => project.visibility === "private").length;

  return <section className="module-page github-directory">
    <div className="module-title-row">
      <div>
        <p className="eyebrow"><Github size={13} /> REPOSITORY DIRECTORY / CONNECTED ACCOUNT</p>
        <h1>GitHub projects</h1>
        <p className="welcome-subtitle">Browse repositories from inside PRUDEN Command. Open a repository or visit its configured deployment without leaving the project directory first.</p>
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

    <p className="github-results-line">Showing <strong>{filtered.length}</strong> of {githubProjects.length} repositories</p>
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
