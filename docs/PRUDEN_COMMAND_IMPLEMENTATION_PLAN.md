# PRUDEN Command — Implementation Plan

**Status:** Phase 0 interface scaffold. No production backend, authentication, database, or agent gateway is connected yet.

## Decisions confirmed

- Agent integration strategy: agent-neutral API first.
- Codebase: existing `jark-zenith/Pruden-Technologies-` repository.
- Access model: founder and team from day one.
- Visual direction: dark navy, PRUDEN blue, silver, restrained cyan accents.
- Safety boundary: do not alter live agents; do not deploy without verification.

## Phase 0 — Interface and architecture baseline

- [x] Establish React + TypeScript + Vite application structure.
- [x] Build responsive command-centre navigation and core module views.
- [x] Label the dashboard as a prototype and distinguish demo values from live data.
- [x] Document intended roles, API boundary, approval policy, and release gates.
- [ ] Install dependencies and run typecheck/build in a development environment.
- [ ] Review accessibility, responsive behavior, and keyboard navigation.

## Phase 1 — Secure application foundation

1. Choose and verify the identity strategy. Prefer a maintained identity provider or a well-supported session implementation rather than custom password cryptography.
2. Define organizations/workspaces and team membership. Roles initially: Founder/Owner, Admin, Project Lead, Contributor, Finance, Read-only.
3. Implement server-side session verification, CSRF protections where applicable, secure cookies, rate limiting, input validation, and server-side permission checks.
4. Add PostgreSQL migrations for users, organizations, memberships, projects, tasks, decisions, approvals, audit events, and integration records.
5. Scope every tenant-owned query by the authenticated user's organization. Add tests for cross-tenant access denial.
6. Add audit records for privileged actions; never log credentials, tokens, or sensitive payloads.
7. Add server health/readiness endpoints, structured redacted logs, request IDs, and safe error responses.

## Phase 2 — Operational MVP

Build in this order:
1. Overview and global search across authorized records.
2. Projects, milestones, task assignments, due dates, dependencies, and evidence links.
3. Decision log and approval queue with requester, scope, risk, cost estimate, expiry, approver, and outcome.
4. Team directory, invitations, role changes, suspension, and offboarding.
5. Risk/incident register and integration status.
6. CRM and service catalogue with least-privilege visibility.
7. Finance snapshot with verified/manual entries first; payment and bank integrations only after review.
8. Notifications, audit search, exports, and reporting.

## Phase 3 — Agent-neutral gateway

The browser never talks directly to an agent provider or the database. Proposed flow:

`Web UI → authenticated application API → policy/permission layer → task queue → provider adapter → agent provider`

The agent provider returns a proposal/result to the gateway. All proposed writes are validated and authorized server-side. Use provider adapters so ElevenLabs/Aurora, Ivy, JARK AI, or another agent can be integrated later without redesigning the business domain.

Initial agent capabilities:
- Read only the projects/tasks explicitly granted to the task.
- Summarize status and blockers with source links.
- Draft a plan and create proposed tasks for human review.
- Submit a proposed code change or pull request only when a separate, scoped GitHub integration is configured and tested.

Agent actions requiring explicit human approval:
- Production deploys, destructive database actions, permission/account changes, payments/refunds, spending, external customer communications, publishing, and legal/regulated decisions.

Controls:
- Per-agent identity, narrow scopes, allowlisted operations, rate/budget/time limits, idempotency keys, approval tokens, correlation IDs, audit trails, timeouts, retry limits, and a kill switch.
- Treat documents, repository content, and model output as untrusted input.
- Do not pass provider secrets to the browser or log them.
- Never let an agent execute arbitrary SQL or gain unrestricted shell access.
- Require independent test results and reviewed diffs before merge/release.

## Phase 4 — Integrations

Each connector starts disconnected and becomes active only after credentials are configured server-side and end-to-end checks pass:
- GitHub repository/PR/status metadata.
- Hosting provider deployments and logs.
- PostgreSQL health/migration status.
- Email/notification provider.
- Agent providers through the shared gateway.
- Payments/finance only after a separate compliance and reconciliation review.

## Data model baseline

- `organizations`, `users`, `memberships`, `invitations`
- `projects`, `project_members`, `milestones`, `tasks`, `task_events`
- `decisions`, `approvals`, `risks`, `incidents`
- `integrations`, `agent_profiles`, `agent_runs`, `agent_proposals`
- `audit_events`, `notifications`, `attachments`

All records should use stable IDs, timestamps, and organization ownership where relevant. Define retention, export, and deletion rules before handling real personal or customer data.

## Release gates

Do not deploy until all are verified:
- Dependencies install reproducibly and production build passes.
- Authentication and server-side authorization tests pass, including cross-tenant denial.
- Secrets are server-side and absent from frontend bundles, logs, and Git history.
- Database migrations, backups, restore, and rollback are documented and tested.
- Critical user flows pass on desktop and mobile; accessibility and keyboard behavior reviewed.
- Approval requirements, audit events, rate limits, and integration failure handling are tested.
- Staging environment and actual deployment target are inspected; no production deploy occurs without explicit authorization.
