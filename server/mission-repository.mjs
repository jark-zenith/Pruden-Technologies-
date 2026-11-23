import { randomUUID } from "node:crypto";
import { MISSION_STATUSES } from "./mission-contract.mjs";

const MAX_MISSIONS_PER_PAGE = 100;
const MAX_ACCESS_TOKEN_LENGTH = 8192;

function requiredText(value, label, maxLength = 2000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(`${label} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function assertMissionForOwner(record, ownerId) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("Mission record must be an object.");
  }
  if (record.ownerId !== ownerId) {
    throw new Error("Mission owner does not match the verified signed-in user.");
  }
  requiredText(record.missionId, "missionId", 160);
  requiredText(record.runId, "runId", 160);
  requiredText(record.requesterId, "requesterId", 160);
  requiredText(record.objective, "objective", 4000);
  if (record.status !== "queued") {
    throw new Error("A new persisted mission must begin in the queued state.");
  }
  if (!Array.isArray(record.assignedAgentIds) || record.assignedAgentIds.length < 1 || record.assignedAgentIds.length > 14) {
    throw new TypeError("Mission assignedAgentIds must contain 1 to 14 agents.");
  }
  if (!Array.isArray(record.acceptanceCriteria) || record.acceptanceCriteria.length < 1) {
    throw new TypeError("Mission acceptanceCriteria must contain at least one criterion.");
  }
  if (!Array.isArray(record.events) || record.events.length !== 1) {
    throw new Error("A new mission must include exactly one initial queued event.");
  }
  const [event] = record.events;
  if (
    event?.type !== "mission_queued" ||
    event.sequence !== 1 ||
    event.missionId !== record.missionId ||
    event.runId !== record.runId
  ) {
    throw new Error("The initial mission event must be mission_queued, sequence 1, and match the mission/run IDs.");
  }
  requiredText(event.eventId, "initial event eventId", 160);
  requiredText(event.actorId, "initial event actorId", 160);
}

function assertOwnerNote(note) {
  requiredText(note, "note", 1000);
}

function boundedLimit(value) {
  if (value === undefined) return 50;
  if (!Number.isInteger(value) || value < 1) throw new TypeError("Mission list limit must be a positive integer.");
  return Math.min(value, MAX_MISSIONS_PER_PAGE);
}

function throwDatabaseError(action, error) {
  if (error) {
    const message = typeof error.message === "string" ? error.message.slice(0, 300) : "Unknown database error.";
    throw new Error(`${action}: ${message}`);
  }
}

export function createMissionRepository({ client, ownerId }) {
  if (!client || typeof client.rpc !== "function" || typeof client.from !== "function") {
    throw new TypeError("A Supabase client with rpc() and from() is required.");
  }
  requiredText(ownerId, "ownerId", 160);

  return Object.freeze({
    ownerId,

    async createMission(record) {
      assertMissionForOwner(record, ownerId);
      const { data, error } = await client.rpc("pruden_create_mission", { p_record: record });
      throwDatabaseError("Mission creation failed", error);
      if (!data?.mission || !data?.run || !data?.event) {
        throw new Error("Mission creation returned an incomplete persistence result.");
      }
      return data;
    },

    async appendNote(missionId, runId, note) {
      requiredText(missionId, "missionId", 160);
      requiredText(runId, "runId", 160);
      assertOwnerNote(note);
      const { data, error } = await client.rpc("pruden_append_mission_note", {
        p_mission_id: missionId,
        p_run_id: runId,
        p_note: note.trim()
      });
      throwDatabaseError("Mission note append failed", error);
      if (!data?.event_id || data.mission_id !== missionId || data.run_id !== runId || data.event_type !== "mission_note") {
        throw new Error("Mission note append returned an invalid persistence result.");
      }
      return data;
    },

    async listMissions({ status, limit } = {}) {
      if (status !== undefined && !MISSION_STATUSES.includes(status)) {
        throw new TypeError(`Unsupported mission status: ${status}`);
      }
      let query = client
        .from("pruden_missions")
        .select("mission_id,requester_id,objective,deadline_at,status,assigned_agent_ids,acceptance_criteria,dependencies,subtasks,created_at,updated_at,started_at,finished_at")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(boundedLimit(limit));
      if (status !== undefined) query = query.eq("status", status);
      const { data, error } = await query;
      throwDatabaseError("Mission list failed", error);
      return data || [];
    },

    async getMission(missionId) {
      requiredText(missionId, "missionId", 160);
      const { data: mission, error: missionError } = await client
        .from("pruden_missions")
        .select("*")
        .eq("mission_id", missionId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      throwDatabaseError("Mission read failed", missionError);
      if (!mission) return null;

      const [runsResult, eventsResult] = await Promise.all([
        client.from("pruden_mission_runs").select("*").eq("mission_id", missionId).eq("owner_id", ownerId).order("run_number", { ascending: false }),
        client.from("pruden_mission_events").select("*").eq("mission_id", missionId).eq("owner_id", ownerId).order("sequence", { ascending: true })
      ]);
      throwDatabaseError("Mission run read failed", runsResult.error);
      throwDatabaseError("Mission event read failed", eventsResult.error);
      return { mission, runs: runsResult.data || [], events: eventsResult.data || [] };
    }
  });
}

export async function createOwnerScopedMissionRepository(accessToken, options = {}) {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > MAX_ACCESS_TOKEN_LENGTH) {
    throw new Error("Your signed-in session is required for mission operations.");
  }

  const url = options.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = options.anonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) throw new Error("Supabase server configuration is missing.");

  let createClientImpl = options.createClientImpl;
  if (typeof createClientImpl !== "function") {
    ({ createClient: createClientImpl } = await import("@supabase/supabase-js"));
  }
  const client = createClientImpl(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data?.user?.id) throw new Error("Your session could not be verified. Sign in again.");

  return createMissionRepository({ client, ownerId: data.user.id });
}
