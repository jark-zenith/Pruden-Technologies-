# Bridge Agent Access Policy

This is the proposed default-deny policy for the Pruden Intelligence Bridge. It must be enforced by server code; UI labels and model prompts are not security boundaries.

| Principal | Initial access | Prohibited by default |
| --- | --- | --- |
| Ivy | Manage Bridge configuration; inspect connection status; read approved GitHub, Render, and registered Supabase metadata | Read raw credentials; bypass source allowlists; perform writes without separate action permission and approval |
| Sentinel | Read-only review of policy configuration, sanitized audit events, and connection-health metadata | Change policies; execute source actions; read unrestricted application data |
| Atlas / Nova / specialist agents | Narrow read tools for assigned sources and projects, scoped to a task | Discover arbitrary sources; enumerate unapproved repositories/projects; use admin controls |
| PTMS founder | Configure allowlists and review/approve consequential actions | None implied by model output; authentication and server authorization remain mandatory |

## Approval envelope for future actions

An approved action must identify: requester, executing agent, exact source/resource, action type, validated payload hash, preconditions, expiration, idempotency key, approver, approval timestamp, execution result, and audit correlation ID. Approval must expire if the payload changes. Denial, timeout, and provider failure must be recorded accurately.

## Enforcement requirements

- Authorize on every request at the PTMS server and Bridge service.
- Resolve agent identity from trusted PTMS runtime context, never from a caller-supplied display name alone.
- Resolve resource IDs through a server-maintained allowlist.
- Keep source credentials in server-side secret storage.
- Never equate “Ivy has full access” with unrestricted credential or raw database access.
- Fail closed if authorization, source configuration, or audit requirements cannot be satisfied.
