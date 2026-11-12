# PTMS v2.0 Mission Execution Contract

**Status:** The pure mission contract is merged to \`main\`. The existing Home HQ task bridge now records model responses as awaiting independent verification. Dedicated mission/run persistence and the PTMS-owned Composio gateway remain incomplete.

## Why this increment exists

A successful model response is not proof that a mission's tools succeeded, acceptance criteria passed, or an independent reviewer verified the result. The workforce runtime now returns an explicit \`response_ready\` envelope with \`missionStatus: "not_created"\` and \`verificationStatus: "not_performed"\`; it does not label a model response as a completed mission.

The Home HQ task bridge persists the task and audit trail in the signed-in owner's existing Supabase tables. A successful model response leaves that task in \`awaiting_verification\`, not \`completed\`. The dashboard is extended only to display this state; its layout is not redesigned.

## Canonical mission lifecycle

- \`queued\`: accepted for execution but not started.
- \`running\`: an assigned agent is actively working.
- \`awaiting_approval\`: paused; the referenced approval must be approved before the mission can be re-queued.
- \`blocked\`: paused for a recorded blocker; a resolution is required before re-queueing.
- \`failed\`: execution ended with a recorded error.
- \`awaiting_verification\`: output exists, but acceptance criteria have not been independently verified.
- \`verified_complete\`: terminal state requiring evidence references and a verifier who is not listed among the mission executors.

There is deliberately no generic \`completed\` mission status.

## Agent response versus mission completion

The specialist API response uses:

- \`status: "response_ready"\`
- \`completionKind: "agent_response_only"\`
- \`missionStatus: "not_created"\`
- \`verificationStatus: "not_performed"\`

The Home HQ task projection uses \`pruden_tasks.status = "awaiting_verification"\` after a successful agent response. Its audit event is \`agent_run.awaiting_verification\` with the existing audit outcome \`blocked\`; failures use \`agent_run.failed\` with outcome \`failure\`. This preserves the existing audit outcome constraint.

The ordinary task-list action can still mark a task completed under Founder control. That task-level status is not equivalent to a mission's \`verified_complete\` state. Independent Sentinel verification and a persistent mission record are still required before PTMS can claim a mission is verified complete.

## Record envelope

Version 1 records:

- Stable \`missionId\` and \`runId\`.
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
- \`awaiting_approval\` requires an approval ID. Re-queueing from that state requires the same approval ID and an explicit \`approved\` decision.
- \`blocked\` and \`failed\` require a reason.
- A model output moves the record to \`awaiting_verification\`, not \`verified_complete\`.
- \`verified_complete\` requires at least one evidence reference, one passing result for every acceptance criterion, evidence references attached to each criterion, and an independent verifier not present in \`executorAgentIds\`.
- This pure helper does not authenticate actor IDs, fetch or authorize Supabase approval records, check approval owner/target/scope/expiry/one-time-use, or confirm that a verifier is the registered Sentinel. The future server gateway must perform those checks using trusted server-side data before calling these transitions.
- Failed and verified-complete states are terminal for a run. A retry should create a new run ID rather than rewriting prior activity.

## Current integration boundary

- \`server/mission-contract.mjs\` remains a pure lifecycle/evidence contract; it is not yet backed by dedicated mission/run tables.
- Home HQ tasks, approvals and audit events use the existing owner-scoped Supabase tables and Realtime feed. Active run state and the recent workforce event buffer remain process-memory-only and reset on server restart.
- The live \`pruden_tasks.status\` column is text with no status CHECK constraint, so \`awaiting_verification\` is supported without a schema migration. The audit outcome constraint permits only \`success\`, \`failure\` and \`blocked\`; the new awaiting-verification event uses \`blocked\` plus a specific action/details payload.
- The current migration inventory is divergent: 21 SQL migration files in GitHub versus 27 applied Supabase entries, with six exact version/name matches and one additional shared version whose recorded migration name differs. Do not reset, rewrite or reapply applied history. Reconcile it before adding the dedicated mission/run tables.
- No Composio SDK or PTMS-owned Composio runtime adapter is present in the PTMS server package. ChatGPT-side Composio connections are not PTMS server connections.

## Next implementation steps

1. Reconcile migration history without resetting or rewriting applied history.
2. Add versioned, owner-scoped mission and append-only execution-event tables in a reviewed SQL migration.
3. Add a server-side repository using the existing Supabase client and owner-scoped server boundary.
4. Wrap Ivy delegation and specialist execution in mission/run lifecycle transitions.
5. Add a PTMS-owned Composio adapter only after a PTMS Composio project key and app connections are configured server-side.
6. Require Sentinel to verify stored evidence before setting \`verified_complete\`.
7. Update Mission Control only after persistence and execution APIs are tested.

No production data, settings, secrets, migrations, permissions, or deployments are changed by this feature-branch change.
