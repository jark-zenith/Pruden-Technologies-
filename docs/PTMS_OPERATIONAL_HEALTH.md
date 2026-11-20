# PTMS Operational Health Snapshot

## Endpoint

`GET /api/operations/health` returns a no-store operational snapshot. It is registered behind the existing `/api` authentication middleware and requires an unlocked PRUDEN Command session. The public `GET /health` endpoint remains the minimal process-liveness check.

## What the snapshot means

- `service.status = "alive"` means the authenticated request reached the running PTMS process.
- `readiness.readyForPersistentMissionExecution = false` is intentional until the mission contract is wired into specialist execution, a durable mission/run repository and append-only ledger exist, and the PTMS-owned tool gateway is implemented.
- `workforce.policySwitches` reports registry policy switches only. It does not prove that a provider credential, repository allowlist, connected account, or tool call is usable.
- Where present, `integrations.*.configured` reports local configuration. It is not a successful connection test. `verified` remains false unless a live runtime check has actually been recorded by the underlying capability source.
- `integrations.supabase.status = "adapter_not_implemented"` means the project-intelligence bridge does not query application databases. It must not be interpreted as a database outage.
- `integrations.composio.status = "not_implemented"` means ChatGPT-side Composio connections are not available to PTMS until a separate PTMS-owned server adapter and connection context are implemented.

## Safety and scope

The snapshot reads only local registry and capability metadata. It does not call external providers, query Supabase, inspect customer or finance records, read environment-variable values, or mutate data. It deliberately omits credentials, contact details, raw provider metadata, and repository allowlists. A missing log or metrics window is not treated as an outage; service liveness, deploy state, and telemetry availability must be assessed separately.

## Current limitation

The existing mission lifecycle contract is a pure helper and is not yet connected to the specialist execution path. Active workforce runs, recent runtime events, and shared group history remain process-memory-only. The endpoint makes this limitation explicit; it does not claim that missions are persisted or independently verified.
