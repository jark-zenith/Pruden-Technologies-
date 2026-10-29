# Pruden Intelligence Bridge (PIB)

## Purpose

PIB is a dedicated module inside the existing `jark-zenith/Pruden-Technologies-` repository and PTMS runtime. It is not a separate repository, service, or product. Its frontend, server-side source adapters, source registry, workforce permissions, approval integration, tests, and audit views are maintained and deployed as part of PTMS.

## Current-state constraints

PTMS already has a generated GitHub/Render inventory and Ivy GitHub tools. The inventory workflow refreshes a snapshot every six hours; it is not a live query API. Ivy's GitHub runtime defaults to allowing only `jark-zenith/Pruden-Technologies-` unless `PRUDEN_GITHUB_REPOS` is configured. GitHub reads require `GITHUB_TOKEN`; Render reads require `RENDER_API_KEY` on the running private service. Supabase workspace operations are owner-scoped and must not be treated as permission to inspect every application's database.

## In-repository architecture

- **PTMS control panel:** source registry, agent/source policy, approval queue visibility, verified connection status, and audit visibility.
- **PTMS server-side Bridge module:** provider adapters, normalized read-only API, authentication inherited from the PTMS server boundary, input validation, bounded pagination, rate limiting, and structured audit events.
- **Initial sources:** GitHub, Render, and explicitly registered Supabase projects.
- **Agent access:** Ivy has privileged Bridge administration and access to approved source reads. Sentinel receives read-only policy/security review capabilities. Other agents receive only task-specific tools and source scopes assigned to them.
- **Data flow:** agent tool call -> PTMS server-side authorization -> in-repo Bridge adapter -> approved source -> normalized response -> PTMS audit record.
- **Secrets:** source credentials remain in the PTMS server's secret environment. They are never returned to an agent or browser.

## Initial API contract (proposal)

These are planned internal PTMS routes, not implemented endpoints yet:
- `GET /api/project-intelligence/status`: configured/verified state per adapter, with no secret values.
- `GET /api/project-intelligence/github/repositories`: allowlisted repository metadata and bounded recent activity.
- `GET /api/project-intelligence/render/services`: allowlisted service metadata and deployment state.
- `GET /api/project-intelligence/supabase/projects`: only explicitly registered project identifiers and non-sensitive metadata.
- A future source-specific read endpoint must declare its data classification, allowed agent scopes, limits, and audit fields before implementation.

All endpoints must be registered in the existing `server.mjs` process behind PTMS's authenticated `/api` middleware. Do not add public endpoints for source data or create a second service solely for the Bridge.

## Security model

1. Default deny for source and agent scopes.
2. Use PTMS's authenticated server boundary and server-held provider credentials; never expose credentials to browser code.
3. Apply per-agent and per-source allowlists on every request.
4. Do not accept arbitrary URLs, table names, SQL, repository names, or service IDs from an agent without validating against a server-maintained registry.
5. Supabase adapters must use dedicated least-privilege credentials or source-owned APIs. Never use a project service-role key as a general-purpose cross-app data reader.
6. Return normalized, bounded data only; redact tokens, secrets, personal data, and environment values.
7. Record actor, source, operation, resource identifier, timestamp, outcome, and correlation ID; never record credentials or sensitive payloads.
8. Keep all source actions read-only in phase 1.

## Controlled actions later

Write actions are out of scope for phase 1. Before any action is enabled, require a named action allowlist, separate write capability, explicit founder approval tied to a concrete payload, idempotency key, precondition checks, audit event, and verifiable execution receipt. GitHub writes should continue to use feature branches and pull requests; no direct writes to the default branch. Production deploys, permission changes, secret access, merges, payments, and external messages remain separately approval-gated.

## Delivery plan

1. Add an in-repository Bridge module and route registration to the existing PTMS server.
2. Implement GitHub read adapter by reusing existing GitHub integration logic and applying the source registry.
3. Implement Render read adapter using the existing runtime configuration and read-only calls.
4. Design the Supabase adapter per registered project and least-privilege access; do not assume shared credentials.
5. Add server-side per-agent/source policy enforcement, verified connection status, and audit events.
6. Connect the PTMS Project Intelligence panel to the authenticated endpoints.
7. Run unit tests, integration tests with mocked providers, PTMS typecheck/build, and a permission-denial matrix.
8. Verify production configuration and live read-only smoke tests before reporting connected status.

## Non-goals for phase 1

- No separate repository or independently deployed service.
- No agent access to all Supabase tables by default.
- No arbitrary SQL execution.
- No secret retrieval or display.
- No source writes, deployments, merges, or permission changes.
- No claim that a provider is connected based only on an environment variable.
