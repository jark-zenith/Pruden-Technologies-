import { githubCapabilityStatus } from "./ivy-github.mjs";

export function ivyCapabilityStatus() {
  const supabaseConfigured = Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY));
  const gmailConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.IVY_TOKEN_ENCRYPTION_KEY);
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  return {
    generatedAt: new Date().toISOString(),
    reasoning: { status: anthropicConfigured ? "configured_unverified" : "not_connected", provider: "anthropic", model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5" },
    workspaceDatabase: { status: supabaseConfigured ? "configured_unverified" : "not_connected", scope: "signed-in founder's row-level-security-protected workspace tables" },
    email: { status: gmailConfigured ? "configured_unverified" : "setup_required", provider: "Gmail OAuth", note: "Gmail has a separate connection/status panel; confirm its connected status before use." },
    github: githubCapabilityStatus(),
    whatsapp: { status: "not_implemented", provider: "WhatsApp Business Platform", writeToolsEnabled: false },
    payments: { status: "not_implemented", writeToolsEnabled: false },
    contracts: { status: "not_implemented", signingEnabled: false, note: "Document drafting only; no electronic signature integration." },
    deployments: { status: "not_implemented", productionDeployEnabled: false },
    controls: { founderApprovalRequiredFor: ["external messages", "payments", "contracts and signatures", "production deployments", "permission changes", "secret access", "merging pull requests"], githubWriteToolsEnabled: githubCapabilityStatus().writeToolsEnabled, repositoryCreationEnabled: githubCapabilityStatus().repositoryCreationEnabled }
  };
}
export const ivyCapabilityTool = {
  name: "get_capability_status",
  description: "Check which integrations are configured or implemented. Distinguish configured-but-unverified from connected/working. Never infer success from environment variables alone.",
  input_schema: { type: "object", properties: {}, required: [] }
};
