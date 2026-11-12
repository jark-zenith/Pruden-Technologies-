import test from "node:test";
import assert from "node:assert/strict";
import {
  MISSION_STATUS,
  MISSION_STATUSES,
  appendMissionEvent,
  createMissionRecord,
  transitionMissionStatus
} from "./mission-contract.mjs";

function makeMission(overrides = {}) {
  let id = 0;
  return createMissionRecord({
    requesterId: "founder",
    ownerId: "founder",
    objective: "Complete a bounded read-only research mission.",
    assignedAgentIds: ["atlas", "sentinel"],
    executorAgentIds: ["atlas"],
    acceptanceCriteria: ["Original source URLs are recorded", "Sentinel independently verifies the result"],
    ...overrides
  }, {
    idFactory: () => "test-id-" + (++id),
    now: () => new Date("2026-11-11T16:00:00.000Z")
  });
}

test("mission records receive stable mission/run IDs and a queued initial state", () => {
  const mission = makeMission();
  assert.equal(mission.missionId, "test-id-1");
  assert.equal(mission.runId, "test-id-2");
  assert.equal(mission.status, MISSION_STATUS.QUEUED);
  assert.equal(mission.schemaVersion, 1);
  assert.equal(mission.createdAt, "2026-11-11T16:00:00.000Z");
  assert.deepEqual(mission.acceptanceCriteria, [
    "Original source URLs are recorded",
    "Sentinel independently verifies the result"
  ]);
  assert.deepEqual(mission.events, []);
});

test("mission creation rejects missing ownership, objective, or acceptance criteria", () => {
  assert.throws(() => makeMission({ objective: " " }), /objective/);
  assert.throws(() => makeMission({ requesterId: "" }), /requesterId/);
  assert.throws(() => makeMission({ acceptanceCriteria: [] }), /acceptanceCriteria/);
});

test("mission creation requires at least one assigned agent", () => {
  assert.throws(() => makeMission({ assignedAgentIds: [] }), /assignedAgentIds/);
});

test("agent completion requires a matching start and cannot finish twice", () => {
  const mission = makeMission();
  assert.throws(() => appendMissionEvent(mission, {
    type: "agent_finished", actorId: "atlas", agentId: "atlas"
  }), /unmatched preceding agent_started/);
  const started = appendMissionEvent(mission, {
    type: "agent_started", actorId: "ivy", agentId: "atlas"
  });
  const finished = appendMissionEvent(started, {
    type: "agent_finished", actorId: "atlas", agentId: "atlas"
  });
  assert.deepEqual(finished.executorAgentIds, ["atlas"]);
  assert.throws(() => appendMissionEvent(finished, {
    type: "agent_finished", actorId: "atlas", agentId: "atlas"
  }), /unmatched preceding agent_started/);
});

test("terminal mission states reject later activity events", () => {
  const running = transitionMissionStatus(makeMission(), MISSION_STATUS.RUNNING, { actorId: "ivy" });
  const failed = transitionMissionStatus(running, MISSION_STATUS.FAILED, { actorId: "atlas", error: "Provider timed out." });
  assert.throws(() => appendMissionEvent(failed, { type: "mission_note", actorId: "ivy" }), /terminal state/);

  const pending = transitionMissionStatus(running, MISSION_STATUS.AWAITING_VERIFICATION, { actorId: "atlas", outputSummary: "Output ready." });
  const evidence = [
    { kind: "source", ref: "https://example.com/a" },
    { kind: "verification", ref: "github://checks/mission" }
  ];
  const verified = transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    actorId: "sentinel", verifierId: "sentinel", evidence,
    criteriaResults: [
      { criterion: "Original source URLs are recorded", passed: true, evidenceRefs: ["https://example.com/a"] },
      { criterion: "Sentinel independently verifies the result", passed: true, evidenceRefs: ["github://checks/mission"] }
    ]
  });
  assert.throws(() => appendMissionEvent(verified, { type: "mission_note", actorId: "ivy" }), /terminal state/);
});

test("mission creation rejects executor identities outside the assigned-agent scope", () => {
  assert.throws(() => makeMission({ executorAgentIds: ["vault"] }), /subset of assignedAgentIds/);
});

test("the canonical lifecycle has no generic completed state", () => {
  assert.ok(MISSION_STATUSES.includes("awaiting_verification"));
  assert.ok(MISSION_STATUSES.includes("verified_complete"));
  assert.equal(MISSION_STATUSES.includes("completed"), false);
  assert.throws(() => transitionMissionStatus(makeMission(), "completed", { actorId: "ivy" }), /Unsupported mission status/);
});

test("approval-gated work cannot re-queue without the exact approved approval", () => {
  const waiting = transitionMissionStatus(makeMission(), MISSION_STATUS.AWAITING_APPROVAL, {
    actorId: "ivy",
    approvalId: "approval-42"
  });
  assert.equal(waiting.status, MISSION_STATUS.AWAITING_APPROVAL);
  assert.throws(() => transitionMissionStatus(waiting, MISSION_STATUS.QUEUED, {
    actorId: "founder",
    approvalId: "approval-42"
  }), /exact approved approval/);
  const queued = transitionMissionStatus(waiting, MISSION_STATUS.QUEUED, {
    actorId: "founder",
    approvalId: "approval-42",
    approvalDecision: "approved"
  });
  assert.equal(queued.status, MISSION_STATUS.QUEUED);
});

test("blocked missions require a reason and an explicit resolution before re-queueing", () => {
  const mission = makeMission();
  assert.throws(() => transitionMissionStatus(mission, MISSION_STATUS.BLOCKED, { actorId: "ivy" }), /blocker/);
  const blocked = transitionMissionStatus(mission, MISSION_STATUS.BLOCKED, {
    actorId: "ivy",
    blocker: "The research provider is not configured."
  });
  assert.equal(blocked.status, MISSION_STATUS.BLOCKED);
  const resumed = transitionMissionStatus(blocked, MISSION_STATUS.QUEUED, {
    actorId: "ivy",
    resolution: "Provider configuration was verified in a separate approved change."
  });
  assert.equal(resumed.status, MISSION_STATUS.QUEUED);
  assert.equal(resumed.blocker, null);
});

test("failed missions require an error and become terminal", () => {
  const running = transitionMissionStatus(makeMission(), MISSION_STATUS.RUNNING, { actorId: "ivy" });
  const failed = transitionMissionStatus(running, MISSION_STATUS.FAILED, {
    actorId: "atlas",
    error: "The read-only research request timed out."
  });
  assert.equal(failed.status, MISSION_STATUS.FAILED);
  assert.equal(failed.errors.length, 1);
  assert.ok(failed.finishedAt);
  assert.throws(() => transitionMissionStatus(failed, MISSION_STATUS.QUEUED, { actorId: "ivy" }), /Invalid mission transition/);
});

test("model output moves a mission to awaiting_verification, not verified completion", () => {
  const running = transitionMissionStatus(makeMission(), MISSION_STATUS.RUNNING, { actorId: "ivy" });
  const pending = transitionMissionStatus(running, MISSION_STATUS.AWAITING_VERIFICATION, {
    actorId: "atlas",
    outputSummary: "Found three candidate sources; original pages still need review."
  });
  assert.equal(pending.status, MISSION_STATUS.AWAITING_VERIFICATION);
  assert.equal(pending.verification, null);
  assert.equal(pending.finishedAt, null);
  assert.throws(() => transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    actorId: "atlas",
    verifierId: "atlas",
    evidence: [{ kind: "source", ref: "https://example.com" }]
  }), /independent/);
});

test("verified completion requires evidence and an independent verifier", () => {
  const running = transitionMissionStatus(makeMission(), MISSION_STATUS.RUNNING, { actorId: "ivy" });
  const pending = transitionMissionStatus(running, MISSION_STATUS.AWAITING_VERIFICATION, {
    actorId: "atlas",
    outputSummary: "Three original source pages were inspected."
  });
  assert.throws(() => transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    actorId: "sentinel",
    verifierId: "sentinel",
    evidence: []
  }), /evidence/);
  const evidence = [
    { kind: "source_page", ref: "https://example.com/source-a", summary: "Original employer listing inspected." },
    { kind: "verification", ref: "github://checks/mission-42", summary: "Independent acceptance review passed." }
  ];
  const verified = transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    actorId: "sentinel",
    verifierId: "sentinel",
    evidence,
    criteriaResults: [
      { criterion: "Original source URLs are recorded", passed: true, evidenceRefs: ["https://example.com/source-a"] },
      { criterion: "Sentinel independently verifies the result", passed: true, evidenceRefs: ["github://checks/mission-42"] }
    ]
  });
  assert.equal(verified.status, MISSION_STATUS.VERIFIED_COMPLETE);
  assert.equal(verified.verification.verifierId, "sentinel");
  assert.equal(verified.verification.criteriaResults.length, 2);
  assert.equal(verified.evidence.length, 2);
  assert.ok(verified.finishedAt);
  assert.throws(() => transitionMissionStatus(verified, MISSION_STATUS.RUNNING, { actorId: "ivy" }), /Invalid mission transition/);
});

test("mission activity is append-only, sequenced, and scoped to assigned agents", () => {
  const mission = makeMission();
  const started = appendMissionEvent(mission, {
    type: "agent_started",
    actorId: "ivy",
    agentId: "atlas",
    summary: "Atlas accepted the assigned research subtask."
  });
  const toolStarted = appendMissionEvent(started, {
    type: "tool_started",
    actorId: "atlas",
    agentId: "atlas",
    toolName: "research_search_web",
    resourceRef: "public-web"
  });
  const toolFailed = appendMissionEvent(toolStarted, {
    type: "tool_failed",
    actorId: "atlas",
    agentId: "atlas",
    toolName: "research_search_web",
    outcome: "timeout",
    summary: "Provider timed out."
  });
  assert.deepEqual(toolFailed.events.map(event => event.sequence), [1, 2, 3]);
  assert.deepEqual(toolFailed.executorAgentIds, ["atlas"]);
  assert.equal(toolFailed.events[2].outcome, "timeout");
  assert.equal(mission.events.length, 0);
  assert.throws(() => appendMissionEvent(mission, {
    type: "agent_started",
    actorId: "ivy",
    agentId: "vault"
  }), /not assigned/);
});

test("verified completion must pass every acceptance criterion and cite stored evidence", () => {
  const running = transitionMissionStatus(makeMission(), MISSION_STATUS.RUNNING, { actorId: "ivy" });
  const pending = transitionMissionStatus(running, MISSION_STATUS.AWAITING_VERIFICATION, {
    actorId: "atlas",
    outputSummary: "Candidate results are ready for independent review."
  });
  const evidence = [
    { kind: "source_page", ref: "https://example.com/source-a" },
    { kind: "verification", ref: "github://checks/mission-43" }
  ];
  const base = { actorId: "sentinel", verifierId: "sentinel", evidence };
  assert.throws(() => transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, base), /one result for every acceptance criterion/);
  assert.throws(() => transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    ...base,
    criteriaResults: [{ criterion: "Original source URLs are recorded", passed: true, evidenceRefs: ["https://example.com/source-a"] }]
  }), /one result for every acceptance criterion/);
  assert.throws(() => transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    ...base,
    criteriaResults: [
      { criterion: "Original source URLs are recorded", passed: true, evidenceRefs: ["https://example.com/source-a"] },
      { criterion: "Sentinel independently verifies the result", passed: false, evidenceRefs: ["github://checks/mission-43"] }
    ]
  }), /must be marked passed/);
  assert.throws(() => transitionMissionStatus(pending, MISSION_STATUS.VERIFIED_COMPLETE, {
    ...base,
    criteriaResults: [
      { criterion: "Original source URLs are recorded", passed: true, evidenceRefs: ["https://not-stored.example/source"] },
      { criterion: "Sentinel independently verifies the result", passed: true, evidenceRefs: ["github://checks/mission-43"] }
    ]
  }), /must reference evidence stored/);
});
