# Project Operations Center — rollout notes

## Current inventory source

`src/githubProjects.ts` is currently a checked-in snapshot. It is not a real-time provider API. The scheduled sync workflow replaces it with the current repositories visible to the `jark-zenith` owner account and the services returned by the connected Render workspace.

## Enable automatic inventory sync

Add these repository Actions secrets before enabling the workflow:

- `GH_SYNC_TOKEN`: GitHub fine-grained personal access token scoped to the `jark-zenith` repositories with read-only repository metadata/content access. It is used only to list repository metadata.
- `RENDER_API_KEY`: Render API key with read access to services in the workspace containing the production services.

The workflow runs every six hours and can also be run manually from Actions. It maps Render services to repositories by the service's configured repository URL and records all matched services in `deploymentServices`. The primary URL is selected with static sites first, then web services. It does not deploy or modify any product service.

If either secret is missing or an API call fails, the sync fails without committing a partial inventory. A repository with no matched Render service remains visible with `deploymentUrl: null`.

## Data-source honesty

- A configured deployment URL is not an uptime check.
- A repository's presence does not mean it is deployed.
- Visitor analytics and registered users require separate provider/backend integrations.
- User-level information must remain behind server-side authorization and must not be exposed by this public React bundle.
- Never add Render API keys, GitHub tokens, Supabase service-role keys, or other secrets to `VITE_*` variables.

## Remaining project operations work

1. Validate the full GitHub-to-Render mapping after the first successful sync.
2. Add a project detail route and per-project Overview, Analytics, Users, Activity, Infrastructure, Deployments, and Settings views.
3. Add privacy-conscious visitor analytics and project-specific event instrumentation.
4. Add server-only provider adapters for user/account aggregates and hosting metrics.
5. Add founder authorization, audit logging, integration health timestamps, and integration-specific error states.
6. Verify build/tests, RLS and provider access before production release.

The sync workflow is an inventory mechanism only. It does not imply analytics, account data, uptime, or deployment telemetry are connected.
