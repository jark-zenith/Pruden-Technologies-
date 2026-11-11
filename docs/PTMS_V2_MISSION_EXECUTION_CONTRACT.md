# PTMS v2.0 Mission Execution Contract

**Status:** Implemented as a pure, tested contract on a feature branch. It is not yet connected to the HTTP runtime or persisted in Supabase.

## Why this increment exists

The current specialist runner returns `status: "completed"` when a model response is produced. That response is not proof that tools succeeded, acceptance criteria passed, or an independent reviewer verified the result. The current workforce conversation is also process-memory-only.

This contract establishes the status and evidence rules before adding database persistence or changing the existing dashboard.

## Canonical mission lifecycle

- `queued`: accepted for execution but not started.
- `running`: an assigned agent is actively working.
- `awaiting_approval`: paused; the referenced approval must be approved before the mission can be re-queued.
- `blocked`: paused for a recorded blocker; a resolution is required before re-queueing.
- `failed`: execution ended with a recorded error.
- `awaiting_verification`: output exists, but acceptance criteria have not been independently verified.
- `verified_complete`: terminal state requiring evidence references and a verifier who is not listed among the mission executors.

There is deliberately no generic `completed` status.

## Record envelope

Version 1 records:

- Stable `missionId` and `runId`.
- Requester, owner, objective, optional deadline.
- Assigned and executing agent IDs.
- Acceptance criteria, dependencies and subtasks.
- Outputs, errors and evidence references.
- Append-only, sequence-numbered activity events.
- Approval reference, blocker and verification result.
- Created, updated, started and finished timestamps.

The contract does not store raw provider responses, secrets, credentials, customer records, or financial record contents in activity events. Evidence is represented by a bounded kind/reference/summary tuple.

## Permission and verification rules

- A mission can only be assigned to a bounded list of agents; agent-start events must match that list.
- Tool activity events require an explicit tool name.
- `awaiting_approval` requires an approval ID. Re-queueing from that state requires the same approval ID and an explicit `approved` decision.
- `blocked` and `failed` require a reason.
- A model output moves the record to `awaiting_verification`, not `verified_complete`.
- `verified_complete` requires at least one evidence reference, one passing result for every acceptance criterion, evidence references attached to each criterion, and an independent verifier not present in `executorAgentIds`.
- Failed and verified-complete states are terminal for a run. A retry should create a new run ID rather than rewriting prior activity.

## Current integration boundary

This module is deliberately pure: it does not write to Supabase, invoke Composio, execute tools, or change the existing dashboard/API response. It is the contract for the next persistence/runtime increment.

The current PTMS database has owner-scoped project/task/approval/audit tables, but no mission/run ledger. The repository migration history and applied database migration history are currently divergent (20 SQL files in GitHub versus 26 applied entries, with only six exact version/name matches). Do not add or apply a production migration until that drift is reconciled and the final RLS/index design is reviewed.

## Next implementation steps

1. Reconcile migration history without resetting or rewriting applied history.
2. Add versioned, owner-scoped mission and append-only execution-event tables in a reviewed SQL migration.
3. Add a server-side repository using the existing Supabase client and owner-scoped service boundary.
4. Wrap Ivy delegation and specialist execution in mission/run lifecycle transitions.
5. Add a PTMS-owned Composio adapter only after a PTMS Composio project key and app connections are configured server-side.
6. Require Sentinel to verify stored evidence before setting `verified_complete`.
7. Update Mission Control only after persistence and execution APIs are tested.

No production data, settings, secrets, migrations, permissions, or deployments are changed by this contract.
