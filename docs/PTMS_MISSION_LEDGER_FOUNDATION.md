# PTMS v2.0 Mission Ledger Foundation

**Scope:** first persistence increment for the Mission Execution Engine. This document describes the repository migration and owner-scoped repository adapter; it does not claim that Ivy delegation or specialist execution is already connected to the ledger.

## Storage model

- `pruden_missions` stores the stable mission identity, requester, objective, deadline, assigned agents, acceptance criteria, dependencies, subtasks, and current lifecycle status.
- `pruden_mission_runs` stores each execution attempt, its run identity, run number, executor identities, outputs, errors, evidence, approval reference, blocker, verification summary, and timestamps.
- `pruden_mission_events` stores append-only, sequence-numbered mission/run events. This increment persists the initial queued event and owner-authored notes; the schema reserves event types for later handoffs and tool activity.

Mission and run IDs are text keys (up to 160 characters) to preserve the existing pure mission contract's ID format. The first persisted run is numbered `1`. Mission creation is idempotent for a retry with the same owner, mission ID, initial run ID, and matching mission details: it returns the original mission/run/queued event without overwriting later progress. Reusing an ID with different details or a different initial run ID is rejected. Creating later retry runs is not wired yet.

## Security boundary

- Every row is owner-scoped by `owner_id` and references the authenticated Supabase user.
- RLS is enabled on all three tables. Authenticated clients can select only rows whose `owner_id = auth.uid()`.
- Clients receive no direct insert, update, or delete table grants. Creation and event append use narrowly scoped `SECURITY DEFINER` RPC functions with an empty `search_path`, explicit `auth.uid()` checks, and owner/run matching.
- Event rows have no update/delete grant. The current append RPC accepts owner-authored notes only, locks the run row, and assigns the next sequence in the database. It deliberately does not accept claimed agent/tool activity until the PTMS-owned execution gateway can authenticate those actors and verify tool results.
- The repository verifies the caller's Supabase access token with `auth.getUser()` and uses only the anon key plus that user's bearer token. It does not use `SUPABASE_SERVICE_ROLE_KEY`.
- Store summaries and evidence references, not raw tool arguments, credentials, raw provider responses, or customer/finance payloads.

## Deliberate boundary of this increment

The repository exposes owner-scoped create/list/read and founder-note append operations. It is not yet wired into `runAIWorkforceAgent`, Ivy's delegation loop, or a Mission Control route. Agent/tool event writes and status transitions remain blocked until a PTMS-owned execution gateway can authenticate agent identity and persist state transitions atomically. Sentinel verification will be integrated in a subsequent increment. No UI or dashboard redesign is included.

## Migration and deployment safety

`20261123190000_ptms_mission_execution_ledger.sql` is a reviewed repository artifact only. It has **not** been applied to Supabase. The exact PTMS project could not be accessed through the selected connected account during this run, so no live schema or migration-history query was performed. The existing migration-history reconciliation work in [PR #108](https://github.com/jark-zenith/Pruden-Technologies-/pull/108) must be reviewed and reconciled against the exact PTMS project before any application. Do not apply this migration until the project identity and history are re-verified and separately approved.

## Next increment

Wire the owner-scoped repository into Ivy's authenticated request context, create mission/run records before specialist delegation, add a trusted server-only event writer for handoffs/tool activity, and make retries create new run rows. Then add the status-transition RPC and have Sentinel independently verify stored evidence before `verified_complete` is allowed.
