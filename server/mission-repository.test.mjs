import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMissionRepository, createOwnerScopedMissionRepository } from "./mission-repository.mjs";

const OWNER_ID = "d1b4f93a-6c41-4b16-9a21-4f6d4a7a9b12";

function makeMission(overrides = {}) {
  const missionId = "mission-0001";
  const runId = "run-0001";
  return {
    schemaVersion: 1,
    missionId,
    runId,
    requesterId: "founder",
    ownerId: OWNER_ID,
    objective: "Inspect the allowlisted PTMS repository without modifying production.",
    deadlineAt: null,
    status: "queued",
    assignedAgentIds: ["atlas"],
    executorAgentIds: [],
    acceptanceCriteria: ["A source-backed repository summary is recorded."],
    dependencies: [],
    subtasks: [],
    outputs: [],
    errors: [],
    evidence: [],
    events: [{
      eventId: "event-0001",
      missionId,
      runId,
      sequence: 1,
      type: "mission_queued",
      actorId: "founder",
      agentId: null,
      toolName: null,
      resourceRef: null,
      outcome: "queued",
      summary: "Mission accepted and queued.",
      evidenceRef: null,
      occurredAt: "2026-11-23T16:00:00.000Z"
    }],
    approvalId: null,
    blocker: null,
    verification: null,
    createdAt: "2026-11-23T16:00:00.000Z",
    updatedAt: "2026-11-23T16:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    ...overrides
  };
}

function makeQueryClient({ mission = null, runs = [], events = [] } = {}) {
  const queries = [];
  const client = {
    queries,
    rpcCalls: [],
    rpc: async (name, args) => {
      client.rpcCalls.push({ name, args });
      if (name === "pruden_create_mission") return { data: { mission: { mission_id: args.p_record.missionId }, run: { run_id: args.p_record.runId }, event: { event_id: "event-0001" } }, error: null };
      if (name === "pruden_append_mission_note") return { data: { event_id: "event-note-0001", event_type: "mission_note", mission_id: args.p_mission_id, run_id: args.p_run_id }, error: null };
      return { data: null, error: { message: "unexpected RPC" } };
    },
    from(table) {
      const query = { table, filters: [], orders: [], selected: "*", limitValue: null };
      queries.push(query);
      query.select = (columns) => { query.selected = columns; return query; };
      query.eq = (column, value) => { query.filters.push([column, value]); return query; };
      query.order = (column, options) => { query.orders.push([column, options]); return query; };
      query.limit = (value) => { query.limitValue = value; return query; };
      query.maybeSingle = async () => ({ data: mission, error: null });
      query.then = (resolve, reject) => {
        const data = table === "pruden_mission_runs" ? runs : table === "pruden_mission_events" ? events : [];
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      };
      return query;
    }
  };
  return client;
}

test("createMission persists only a queued owner-matched mission with one initial queued event", async () => {
  const client = makeQueryClient();
  const repository = createMissionRepository({ client, ownerId: OWNER_ID });
  const result = await repository.createMission(makeMission());
  assert.equal(result.mission.mission_id, "mission-0001");
  assert.equal(client.rpcCalls[0].name, "pruden_create_mission");
  assert.equal(client.rpcCalls[0].args.p_record.ownerId, OWNER_ID);
});

test("createMission retries keep the same stable IDs and return the repository's existing RPC result", async () => {
  const client = makeQueryClient();
  const repository = createMissionRepository({ client, ownerId: OWNER_ID });
  const record = makeMission();
  const first = await repository.createMission(record);
  const retry = await repository.createMission(record);
  assert.deepEqual(retry, first);
  assert.equal(client.rpcCalls.length, 2);
  assert.deepEqual(client.rpcCalls.map(call => [call.args.p_record.missionId, call.args.p_record.runId]), [
    ["mission-0001", "run-0001"],
    ["mission-0001", "run-0001"]
  ]);
});

test("createMission rejects owner mismatches before reaching the database", async () => {
  const client = makeQueryClient();
  const repository = createMissionRepository({ client, ownerId: OWNER_ID });
  await assert.rejects(repository.createMission(makeMission({ ownerId: "another-owner" })), /owner does not match/);
  assert.equal(client.rpcCalls.length, 0);
});

test("createMission rejects a model response or non-queued record without an initial ledger event", async () => {
  const client = makeQueryClient();
  const repository = createMissionRepository({ client, ownerId: OWNER_ID });
  await assert.rejects(repository.createMission(makeMission({ status: "awaiting_verification" })), /must begin in the queued state/);
  await assert.rejects(repository.createMission(makeMission({ events: [] })), /exactly one initial queued event/);
  assert.equal(client.rpcCalls.length, 0);
});

test("appendNote records only an owner-authored note through the restricted RPC", async () => {
  const client = makeQueryClient();
  const repository = createMissionRepository({ client, ownerId: OWNER_ID });
  const event = await repository.appendNote("mission-0001", "run-0001", "Founder clarified the acceptance criteria.");
  assert.equal(event.event_type, "mission_note");
  assert.equal(client.rpcCalls[0].name, "pruden_append_mission_note");
  assert.equal(client.rpcCalls[0].args.p_note, "Founder clarified the acceptance criteria.");
});

test("listMissions and getMission always scope reads to the verified owner", async () => {
  const client = makeQueryClient({ mission: { mission_id: "mission-0001" }, runs: [{ run_id: "run-0001" }], events: [{ event_id: "event-0001" }] });
  const repository = createMissionRepository({ client, ownerId: OWNER_ID });
  await repository.listMissions({ status: "queued", limit: 500 });
  const listed = client.queries[0];
  assert.deepEqual(listed.filters, [["owner_id", OWNER_ID], ["status", "queued"]]);
  assert.equal(listed.limitValue, 100);
  const detail = await repository.getMission("mission-0001");
  assert.equal(detail.runs.length, 1);
  assert.equal(detail.events.length, 1);
  for (const query of client.queries.slice(1)) {
    assert.ok(query.filters.some(([column, value]) => column === "owner_id" && value === OWNER_ID));
  }
});

test("createOwnerScopedMissionRepository verifies the user token and uses only the anon key plus bearer session", async () => {
  let config;
  const fakeClient = makeQueryClient();
  fakeClient.auth = { getUser: async (token) => ({ data: { user: { id: OWNER_ID } }, error: token === "a".repeat(24) ? null : { message: "invalid" } }) };
  const repository = await createOwnerScopedMissionRepository("a".repeat(24), {
    url: "https://ptms-project.supabase.co",
    anonKey: "public-anon-key",
    createClientImpl: (url, key, options) => { config = { url, key, options }; return fakeClient; }
  });
  assert.equal(repository.ownerId, OWNER_ID);
  assert.equal(config.key, "public-anon-key");
  assert.equal(config.options.global.headers.Authorization, `Bearer ${"a".repeat(24)}`);
  assert.equal("SUPABASE_SERVICE_ROLE_KEY" in config, false);
});

test("createOwnerScopedMissionRepository rejects an invalid user session", async () => {
  const fakeClient = makeQueryClient();
  fakeClient.auth = { getUser: async () => ({ data: { user: null }, error: { message: "invalid token" } }) };
  await assert.rejects(createOwnerScopedMissionRepository("b".repeat(24), {
    url: "https://ptms-project.supabase.co",
    anonKey: "public-anon-key",
    createClientImpl: () => fakeClient
  }), /session could not be verified/);
});

test("migration creates owner-scoped mission/run tables and an append-only event ledger", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261123190000_ptms_mission_execution_ledger.sql", import.meta.url), "utf8");
  assert.match(sql, /create table public\.pruden_missions/i);
  assert.match(sql, /create table public\.pruden_mission_runs/i);
  assert.match(sql, /create table public\.pruden_mission_events/i);
  assert.match(sql, /alter table public\.pruden_mission_events enable row level security/i);
  assert.match(sql, /owner reads own mission events/i);
  assert.match(sql, /grant select on table public\.pruden_missions, public\.pruden_mission_runs, public\.pruden_mission_events\s+to authenticated/i);
  assert.doesNotMatch(sql, /grant[^;]*\b(update|delete)\b[^;]*pruden_mission_events/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /pruden_append_mission_note/i);
  assert.match(sql, /actor_id, summary, occurred_at/i);
  assert.doesNotMatch(sql, /function public\.pruden_append_mission_event/i);
  assert.match(sql, /revoke all on table public\.pruden_missions, public\.pruden_mission_runs, public\.pruden_mission_events/i);
});

test("mission creation is idempotent for the same owner, mission ID, and initial run without overwriting progressed records", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261123190000_ptms_mission_execution_ledger.sql", import.meta.url), "utf8");
  assert.match(sql, /on conflict \(mission_id\) do nothing/i);
  assert.match(sql, /mission id is already in use/i);
  assert.match(sql, /mission id already exists with different mission details/i);
  assert.match(sql, /mission already exists with a different initial run id/i);
  assert.match(sql, /sequence = 1\s+and event_type = 'mission_queued'/i);
  assert.doesNotMatch(sql, /on conflict \(mission_id\) do update/i);
});
