import { githubCapabilityStatus } from "./ivy-github.mjs";

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getProjectIntelligenceStatus(env = process.env) {
  const github = githubCapabilityStatus();
  const renderConfigured = configured(env.RENDER_API_KEY);
  const supabaseConfigured = configured(env.SUPABASE_URL || env.VITE_SUPABASE_URL)
    && configured(env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    mode: "read_only",
    implementation: "in_ptms",
    generatedAt: new Date().toISOString(),
    sources: [
      {
        id: "github",
        name: "GitHub",
        status: github.status,
        configured: github.status !== "not_connected",
        verified: false,
        approvedRepositories: github.approvedRepositories,
        note: github.status === "not_connected"
          ? "GITHUB_TOKEN is not configured on the PTMS server."
          : "Credentials are configured but live source access has not been verified."
      },
      {
        id: "render",
        name: "Render",
        status: renderConfigured ? "configured_unverified" : "not_connected",
        configured: renderConfigured,
        verified: false,
        note: renderConfigured
          ? "RENDER_API_KEY is configured; live source access has not been verified."
          : "RENDER_API_KEY is not configured on the PTMS server."
      },
      {
        id: "supabase",
        name: "Supabase",
        status: "adapter_not_implemented",
        configured: supabaseConfigured,
        verified: false,
        note: supabaseConfigured
          ? "PTMS Supabase credentials exist, but cross-project data access is not implemented. No application databases are queried."
          : "A server-side Supabase connection is not fully configured. Cross-project data access remains disabled."
      }
    ],
    policy: {
      defaultAuthority: "read_only",
      ivy: "privileged_bridge_operator_for_approved_sources",
      sentinel: "read_only_security_review",
      otherAgents: "assigned_sources_and_tools_only",
      writesEnabled: false
    }
  };
}

export function registerProjectIntelligenceRoutes(app) {
  app.get("/api/project-intelligence/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(getProjectIntelligenceStatus());
  });
}
