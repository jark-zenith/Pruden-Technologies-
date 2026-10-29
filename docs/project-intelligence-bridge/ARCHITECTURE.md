# Pruden Intelligence Bridge (PIB)

## Purpose

PIB is the shared, policy-enforced read interface for the Pruden Technologies project ecosystem. The bridge service lives in a separate repository; its control panel, workforce access policy, approval workflow, and audit visibility live inside PTMS.

## Current-state constraints

PTMS already has a generated GitHub/Render inventory and Ivy GitHub tools. The inventory workflow refreshes a snapshot every six hours; it is not a live query API. Ivy's GitHub runtime defaults to allowing only `jark-zenith/Pruden-Technologies-` unless `PRUDEN_GITHUB_REPOS` is configured. GitHub reads require `GITHUB_TOKEN`; Render reads require `RENDER_API_KEY` on the running private service. Supabase workspace operations are owner-scoped and must not be treated as permission to inspect every application's database.

## Target architecture

- **PTMS control plane:** dashboard, source registry, agent/source policy, approvals, connection status, audit views.
- **PIB service (separate repository):** provider adapters, normalized read-only API, authentication, input validation, bounded pagination, rate limiting, health/status endpoints, and structured audit events.
- **Sources, phase 1:** GitHub, Render, Supabase.
- **Agent access:** Ivy has privileged Bridge administration and access to approved source reads. Sentinel receives read-only policy/security review capabilities. Other agents receive only task-specific tools and source scopes assigned to them.
- **Data flow:** agent tool call -> PTMS server-side authorization -> PIB authenticated API -> source adapter -> normalized response -> PTMS audit record.
- **Secrets:** source credentials remain in server-side secret storage. They are never returned to an agent or browser.

## Initial API contract (proposal)

- `GET /health`: liveness only; no credentials or source data.
- `GET /v1/status`: configured/verified state per adapter, with no secret values.
- `GET /v1/github/repositories`, `/v1/github/repositories/:owner/:repo/activity`: allowlisted metadata and bounded recent activity.
- `GET /v1/render/services`, `/v1/render/services/:id/deployments`: allowlisted service metadata and bounded deployment history.
- `GET /v1/supabase/projects`: only explicitly registered project identifiers and non-sensitive metadata.
- A future source-specific read endpoint must declare its data classification, allowed agent scopes, limits, and audit fields before implementation.

These routes are a design proposal, not implemented endpoints.

## Security model

1. Default deny for source and agent scopes.
2. Authenticate PTMS-to-PIB with a server-held credential; rotate it and never expose it to browser code.
3. Apply per-agent and per-source allowlists on every request.
4. Do not accept arbitrary URLs, table names, SQL, repository names, or service IDs from an agent without validating against a registry.
5. Supabase adapters must use dedicated least-privilege credentials or source-owned APIs. Never use a project service-role key as a general-purpose cross-app data reader.
6. Return normalized, bounded data only; redact tokens, secrets, personal data, and environment values.
7. Record actor, source, operation, resource identifier, timestamp, outcome, and correlation ID; never record credentials or sensitive payloads.
8. Keep all source actions read-only in phase 1.

## Controlled actions later

Write actions are out of scope for phase 1. Before any action is enabled, require a named action allowlist, separate write capability, explicit founder approval tied to a concrete payload, idempotency key, precondition checks, audit event, and verifiable execution receipt. GitHub writes should continue to use feature branches and pull requests; no direct writes to the default branch. Production deploys, permission changes, secret access, merges, payments, and external messages remain separately approval-gated.

## Delivery plan

1. Establish repository and API skeleton with tests and security defaults.
2. Implement GitHub read adapter and contract tests.
3. Implement Render read adapter and contract tests.
4. Design the Supabase adapter per registered project and least-privilege access; do not assume shared credentials.
5. Add PTMS server-side client, connection verification, and source/agent policy enforcement.
6. Connect the PTMS Project Intelligence panel to verified endpoints.
7. Run unit tests, integration tests with mocked providers, PTMS typecheck/build, and a permission-denial matrix.
8. Verify production configuration and live read-only smoke tests before reporting connected status.

## Non-goals for phase 1

- No agent access to all Supabase tables by default.
- No arbitrary SQL execution.
- No secret retrieval or display.
- No source writes, deployments, merges, or permission changes.
- No claim that a provider is connected based only on an environment variable.
