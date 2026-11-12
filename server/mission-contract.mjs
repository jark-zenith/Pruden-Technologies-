import { randomUUID } from "node:crypto";

export const MISSION_STATUS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  AWAITING_APPROVAL: "awaiting_approval",
  BLOCKED: "blocked",
  FAILED: "failed",
  AWAITING_VERIFICATION: "awaiting_verification",
  VERIFIED_COMPLETE: "verified_complete"
});

export const MISSION_STATUSES = Object.freeze(Object.values(MISSION_STATUS));

export const MISSION_EVENT_TYPES = Object.freeze([
  "mission_queued",
  "mission_started",
  "approval_requested",
  "approval_decided",
  "mission_blocked",
  "mission_failed",
  "verification_requested",
  "verification_passed",
  "agent_started",
  "agent_finished",
  "tool_started",
  "tool_succeeded",
  "tool_failed",
  "handoff_created",
  "evidence_attached",
  "mission_note"
]);

const INTERNAL_TERMINAL_EVENT = Symbol("internal terminal transition event");

const TRANSITIONS = Object.freeze({
  queued: ["running", "awaiting_approval", "blocked", "failed"],
  running: ["awaiting_approval", "blocked", "failed", "awaiting_verification"],
  awaiting_approval: ["queued", "blocked", "failed"],
  blocked: ["queued", "failed"],
  failed: [],
  awaiting_verification: ["verified_complete", "blocked", "failed"],
  verified_complete: []
});

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object.");
  }
}

function requiredText(value, label, maxLength = 2000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(label + " must be a non-empty string of at most " + maxLength + " characters.");
  }
  return value.trim();
}

function optionalText(value, label, maxLength = 2000) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, label, maxLength);
}

function isoTimestamp(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(label + " must be a valid timestamp.");
  return date.toISOString();
}

function readClock(options = {}) {
  const clock = typeof options.now === "function" ? options.now : () => new Date();
  return isoTimestamp(clock(), "now");
}

function createId(idFactory, label) {
  const value = idFactory();
  return requiredText(value, label, 160);
}

function textList(value, label, { minItems = 0, maxItems = 100, itemMaxLength = 500 } = {}) {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) {
    throw new TypeError(label + " must be an array containing " + minItems + " to " + maxItems + " items.");
  }
  const items = value.map((item, index) => requiredText(item, label + "[" + index + "]", itemMaxLength));
  if (new Set(items).size !== items.length) throw new TypeError(label + " must not contain duplicates.");
  return items;
}

function normalizeSubtasks(value, idFactory) {
  if (!Array.isArray(value) || value.length > 100) {
    throw new TypeError("subtasks must be an array containing at most 100 items.");
  }
  return value.map((item, index) => {
    assertObject(item, "subtasks[" + index + "]");
    return {
      subtaskId: item.subtaskId ? requiredText(item.subtaskId, "subtasks[" + index + "].subtaskId", 160) : createId(idFactory, "subtaskId"),
      title: requiredText(item.title, "subtasks[" + index + "].title", 300),
      assignedAgentId: optionalText(item.assignedAgentId, "subtasks[" + index + "].assignedAgentId", 80),
      dependsOn: textList(item.dependsOn ?? [], "subtasks[" + index + "].dependsOn", { maxItems: 100, itemMaxLength: 160 }),
      acceptanceCriteria: textList(item.acceptanceCriteria ?? [], "subtasks[" + index + "].acceptanceCriteria", { maxItems: 50, itemMaxLength: 500 }),
      status: MISSION_STATUS.QUEUED
    };
  });
}

function normalizeEvidence(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new TypeError("evidence must contain between 1 and 100 evidence references.");
  }
  return value.map((item, index) => {
    assertObject(item, "evidence[" + index + "]");
    return {
      kind: requiredText(item.kind, "evidence[" + index + "].kind", 80),
      reference: requiredText(item.reference ?? item.ref, "evidence[" + index + "].reference", 2000),
      summary: optionalText(item.summary, "evidence[" + index + "].summary", 500),
      capturedAt: item.capturedAt ? isoTimestamp(item.capturedAt, "evidence[" + index + "].capturedAt") : null
    };
  });
}

function normalizeCriteriaResults(acceptanceCriteria, value, evidence) {
  if (!Array.isArray(value) || value.length !== acceptanceCriteria.length) {
    throw new TypeError("criteriaResults must contain one result for every acceptance criterion.");
  }
  const evidenceRefs = new Set(evidence.map(item => item.reference));
  const results = value.map((item, index) => {
    assertObject(item, "criteriaResults[" + index + "]");
    const criterion = requiredText(item.criterion, "criteriaResults[" + index + "].criterion", 1000);
    if (!acceptanceCriteria.includes(criterion)) {
      throw new TypeError("criteriaResults contains an unknown acceptance criterion.");
    }
    if (item.passed !== true) throw new Error("Every acceptance criterion must be marked passed before verification.");
    const evidenceRefsForCriterion = textList(item.evidenceRefs, "criteriaResults[" + index + "].evidenceRefs", {
      minItems: 1,
      maxItems: 100,
      itemMaxLength: 2000
    });
    if (evidenceRefsForCriterion.some(reference => !evidenceRefs.has(reference))) {
      throw new Error("Each acceptance criterion must reference evidence stored on this mission.");
    }
    return { criterion, passed: true, evidenceRefs: evidenceRefsForCriterion };
  });
  const completedCriteria = new Set(results.map(item => item.criterion));
  if (completedCriteria.size !== acceptanceCriteria.length || acceptanceCriteria.some(item => !completedCriteria.has(item))) {
    throw new Error("Every acceptance criterion must have exactly one verification result.");
  }
  return results;
}

function assertMissionRecord(record) {
  assertObject(record, "mission record");
  requiredText(record.missionId, "missionId", 160);
  requiredText(record.runId, "runId", 160);
  if (!MISSION_STATUSES.includes(record.status)) throw new TypeError("Mission record has an unknown status.");
  if (!Array.isArray(record.events)) throw new TypeError("Mission record events must be an array.");
  if (!Array.isArray(record.executorAgentIds)) throw new TypeError("Mission record executorAgentIds must be an array.");
}

export function createMissionRecord(input, options = {}) {
  assertObject(input, "mission input");
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : randomUUID;
  const at = readClock(options);
  const assignedAgentIds = textList(input.assignedAgentIds ?? [], "assignedAgentIds", { minItems: 1, maxItems: 14, itemMaxLength: 80 });
  const executorAgentIds = textList(input.executorAgentIds ?? [], "executorAgentIds", { maxItems: 14, itemMaxLength: 80 });
  if (executorAgentIds.some(id => !assignedAgentIds.includes(id))) {
    throw new TypeError("executorAgentIds must be a subset of assignedAgentIds.");
  }

  return {
    schemaVersion: 1,
    missionId: input.missionId ? requiredText(input.missionId, "missionId", 160) : createId(idFactory, "missionId"),
    runId: input.runId ? requiredText(input.runId, "runId", 160) : createId(idFactory, "runId"),
    requesterId: requiredText(input.requesterId, "requesterId", 160),
    ownerId: requiredText(input.ownerId, "ownerId", 160),
    objective: requiredText(input.objective, "objective", 4000),
    deadlineAt: input.deadlineAt ? isoTimestamp(input.deadlineAt, "deadlineAt") : null,
    status: MISSION_STATUS.QUEUED,
    assignedAgentIds,
    executorAgentIds,
    acceptanceCriteria: textList(input.acceptanceCriteria, "acceptanceCriteria", { minItems: 1, maxItems: 50, itemMaxLength: 1000 }),
    dependencies: textList(input.dependencies ?? [], "dependencies", { maxItems: 100, itemMaxLength: 160 }),
    subtasks: normalizeSubtasks(input.subtasks ?? [], idFactory),
    outputs: [],
    errors: [],
    evidence: [],
    events: [],
    approvalId: null,
    blocker: null,
    verification: null,
    createdAt: at,
    updatedAt: at,
    startedAt: null,
    finishedAt: null
  };
}

export function appendMissionEvent(record, event, options = {}) {
  assertMissionRecord(record);
  assertObject(event, "mission event");
  const type = requiredText(event.type, "event.type", 80);
  if (!MISSION_EVENT_TYPES.includes(type)) throw new TypeError("Unsupported mission event type: " + type);
  if ([MISSION_STATUS.FAILED, MISSION_STATUS.VERIFIED_COMPLETE].includes(record.status) && options[INTERNAL_TERMINAL_EVENT] !== true) {
    throw new Error("Cannot append mission events after a terminal state.");
  }
  const actorId = requiredText(event.actorId, "event.actorId", 160);
  const agentId = optionalText(event.agentId, "event.agentId", 80);
  const toolName = optionalText(event.toolName, "event.toolName", 120);

  if (["agent_started", "agent_finished"].includes(type) && !agentId) {
    throw new TypeError(type + " events require agentId.");
  }
  if (["tool_started", "tool_succeeded", "tool_failed"].includes(type) && !toolName) {
    throw new TypeError(type + " events require toolName.");
  }
  if (type === "agent_started" && !record.assignedAgentIds.includes(agentId)) {
    throw new Error("Agent is not assigned to this mission.");
  }

  if (type === "agent_finished") {
    const starts = record.events.filter(item => item.type === "agent_started" && item.agentId === agentId).length;
    const finishes = record.events.filter(item => item.type === "agent_finished" && item.agentId === agentId).length;
    if (starts <= finishes) throw new Error("agent_finished requires an unmatched preceding agent_started event.");
  }

  const occurredAt = event.occurredAt ? isoTimestamp(event.occurredAt, "event.occurredAt") : readClock(options);
  const entry = {
    eventId: event.eventId ? requiredText(event.eventId, "event.eventId", 160) : createId(options.idFactory || randomUUID, "eventId"),
    missionId: record.missionId,
    runId: record.runId,
    sequence: record.events.length + 1,
    type,
    actorId,
    agentId,
    toolName,
    resourceRef: optionalText(event.resourceRef, "event.resourceRef", 500),
    outcome: optionalText(event.outcome, "event.outcome", 80),
    summary: optionalText(event.summary, "event.summary", 1000),
    evidenceRef: optionalText(event.evidenceRef, "event.evidenceRef", 2000),
    occurredAt
  };

  const executorAgentIds = type === "agent_started" && agentId && !record.executorAgentIds.includes(agentId)
    ? [...record.executorAgentIds, agentId]
    : record.executorAgentIds;

  return {
    ...record,
    executorAgentIds,
    events: [...record.events, entry],
    updatedAt: occurredAt
  };
}

export function transitionMissionStatus(record, nextStatus, details = {}, options = {}) {
  assertMissionRecord(record);
  assertObject(details, "transition details");
  if (!MISSION_STATUSES.includes(nextStatus)) throw new TypeError("Unsupported mission status: " + nextStatus);
  if (!TRANSITIONS[record.status].includes(nextStatus)) {
    throw new Error("Invalid mission transition: " + record.status + " -> " + nextStatus + ".");
  }

  const actorId = requiredText(details.actorId, "actorId", 160);
  const at = details.at ? isoTimestamp(details.at, "at") : readClock(options);
  const next = { ...record, status: nextStatus, updatedAt: at };
  let summary = optionalText(details.summary, "summary", 1000);

  if (nextStatus === MISSION_STATUS.QUEUED) {
    if (record.status === MISSION_STATUS.AWAITING_APPROVAL) {
      if (details.approvalDecision !== "approved" || details.approvalId !== record.approvalId) {
        throw new Error("An exact approved approval record is required before re-queueing.");
      }
      summary ||= "Founder approval recorded; mission re-queued.";
    } else if (record.status === MISSION_STATUS.BLOCKED) {
      summary = requiredText(details.resolution, "resolution", 1000);
    }
    next.blocker = null;
  }

  if (nextStatus === MISSION_STATUS.RUNNING) {
    next.startedAt = record.startedAt || at;
    summary ||= "Mission execution started.";
  }

  if (nextStatus === MISSION_STATUS.AWAITING_APPROVAL) {
    next.approvalId = requiredText(details.approvalId, "approvalId", 160);
    summary ||= "Mission is paused pending the referenced approval.";
  }

  if (nextStatus === MISSION_STATUS.BLOCKED) {
    const reason = requiredText(details.blocker, "blocker", 1000);
    next.blocker = { reason, actorId, at };
    summary ||= reason;
  }

  if (nextStatus === MISSION_STATUS.FAILED) {
    const message = requiredText(details.error, "error", 1000);
    next.errors = [...record.errors, { message, actorId, at }];
    next.finishedAt = at;
    summary ||= message;
  }

  if (nextStatus === MISSION_STATUS.AWAITING_VERIFICATION) {
    const outputSummary = requiredText(details.outputSummary, "outputSummary", 2000);
    next.outputs = [...record.outputs, { summary: outputSummary, actorId, at }];
    summary ||= "Execution output recorded; independent verification is still required.";
  }

  if (nextStatus === MISSION_STATUS.VERIFIED_COMPLETE) {
    const verifierId = requiredText(details.verifierId, "verifierId", 80);
    if (record.executorAgentIds.includes(verifierId)) {
      throw new Error("The verifier must be independent of the mission executors.");
    }
    const evidence = normalizeEvidence(details.evidence);
    const criteriaResults = normalizeCriteriaResults(record.acceptanceCriteria, details.criteriaResults, evidence);
    next.evidence = [...record.evidence, ...evidence];
    next.verification = { verifierId, verifiedAt: at, criteriaResults, evidence };
    next.finishedAt = at;
    summary ||= "Acceptance criteria independently verified.";
  }

  const eventTypeByStatus = {
    queued: "mission_queued",
    running: "mission_started",
    awaiting_approval: "approval_requested",
    blocked: "mission_blocked",
    failed: "mission_failed",
    awaiting_verification: "verification_requested",
    verified_complete: "verification_passed"
  };

  return appendMissionEvent(next, {
    type: eventTypeByStatus[nextStatus],
    actorId,
    agentId: details.agentId,
    toolName: details.toolName,
    resourceRef: details.resourceRef,
    outcome: details.outcome || nextStatus,
    summary,
    occurredAt: at
  }, nextStatus === MISSION_STATUS.FAILED || nextStatus === MISSION_STATUS.VERIFIED_COMPLETE
    ? { ...options, [INTERNAL_TERMINAL_EVENT]: true }
    : options);
}
