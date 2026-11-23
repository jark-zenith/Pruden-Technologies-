-- PTMS 2.0: owner-scoped durable mission/run records and append-only execution evidence.
-- Review in GitHub only. Do not apply until the exact PTMS Supabase project identity
-- and the existing migration-history drift have been re-verified and reconciled.

create table public.pruden_missions (
  mission_id text primary key check (char_length(btrim(mission_id)) between 1 and 160),
  owner_id uuid not null references auth.users(id) on delete cascade,
  requester_id text not null check (char_length(btrim(requester_id)) between 1 and 160),
  objective text not null check (char_length(btrim(objective)) between 1 and 4000),
  deadline_at timestamptz,
  status text not null default 'queued' check (status in (
    'queued', 'running', 'awaiting_approval', 'blocked', 'failed',
    'awaiting_verification', 'verified_complete'
  )),
  assigned_agent_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(assigned_agent_ids) = 'array'),
  acceptance_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria) = 'array'),
  dependencies jsonb not null default '[]'::jsonb check (jsonb_typeof(dependencies) = 'array'),
  subtasks jsonb not null default '[]'::jsonb check (jsonb_typeof(subtasks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (mission_id, owner_id)
);

create table public.pruden_mission_runs (
  run_id text primary key check (char_length(btrim(run_id)) between 1 and 160),
  mission_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  run_number integer not null check (run_number > 0),
  status text not null default 'queued' check (status in (
    'queued', 'running', 'awaiting_approval', 'blocked', 'failed',
    'awaiting_verification', 'verified_complete'
  )),
  executor_agent_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(executor_agent_ids) = 'array'),
  outputs jsonb not null default '[]'::jsonb check (jsonb_typeof(outputs) = 'array'),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  approval_id text,
  blocker jsonb,
  verification jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (mission_id, run_number),
  unique (mission_id, run_id, owner_id),
  foreign key (mission_id, owner_id)
    references public.pruden_missions(mission_id, owner_id) on delete cascade
);

create table public.pruden_mission_events (
  event_id text primary key check (char_length(btrim(event_id)) between 1 and 160),
  mission_id text not null,
  run_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in (
    'mission_queued', 'mission_started', 'approval_requested', 'approval_decided',
    'mission_blocked', 'mission_failed', 'verification_requested', 'verification_passed',
    'agent_started', 'agent_finished', 'tool_started', 'tool_succeeded', 'tool_failed',
    'handoff_created', 'evidence_attached', 'mission_note'
  )),
  actor_id text not null check (char_length(btrim(actor_id)) between 1 and 160),
  agent_id text,
  tool_name text,
  resource_ref text,
  outcome text,
  summary text check (summary is null or char_length(summary) <= 1000),
  evidence_ref text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (run_id, sequence),
  foreign key (mission_id, run_id, owner_id)
    references public.pruden_mission_runs(mission_id, run_id, owner_id) on delete cascade
);

create index pruden_missions_owner_status_created_idx
  on public.pruden_missions(owner_id, status, created_at desc);
create index pruden_mission_runs_owner_mission_number_idx
  on public.pruden_mission_runs(owner_id, mission_id, run_number desc);
create index pruden_mission_events_owner_run_sequence_idx
  on public.pruden_mission_events(owner_id, run_id, sequence);
create index pruden_mission_events_owner_mission_time_idx
  on public.pruden_mission_events(owner_id, mission_id, occurred_at desc);

alter table public.pruden_missions enable row level security;
alter table public.pruden_mission_runs enable row level security;
alter table public.pruden_mission_events enable row level security;

create policy "owner reads own missions"
  on public.pruden_missions for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner reads own mission runs"
  on public.pruden_mission_runs for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner reads own mission events"
  on public.pruden_mission_events for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Clients can read their own records. All writes go through the authenticated,
-- owner-checking RPC functions below; event rows have no update/delete grant.
revoke all on table public.pruden_missions, public.pruden_mission_runs, public.pruden_mission_events
  from public, anon, authenticated;
grant select on table public.pruden_missions, public.pruden_mission_runs, public.pruden_mission_events
  to authenticated;

create or replace function public.pruden_create_mission(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_event jsonb;
  v_mission public.pruden_missions%rowtype;
  v_run public.pruden_mission_runs%rowtype;
  v_event_row public.pruden_mission_events%rowtype;
begin
  if v_owner_id is null then
    raise exception 'Authenticated owner session is required.';
  end if;
  if jsonb_typeof(p_record) is distinct from 'object' then
    raise exception 'Mission record must be a JSON object.';
  end if;
  if p_record->>'ownerId' is distinct from v_owner_id::text then
    raise exception 'Mission owner does not match the authenticated user.';
  end if;
  if p_record->>'status' is distinct from 'queued' then
    raise exception 'New missions must begin in the queued state.';
  end if;
  if jsonb_typeof(p_record->'assignedAgentIds') is distinct from 'array' then
    raise exception 'Mission assignedAgentIds must be an array.';
  end if;
  if jsonb_array_length(p_record->'assignedAgentIds') not between 1 and 14 then
    raise exception 'Mission must assign between 1 and 14 registered agents.';
  end if;
  if jsonb_typeof(p_record->'acceptanceCriteria') is distinct from 'array' then
    raise exception 'Mission acceptanceCriteria must be an array.';
  end if;
  if jsonb_array_length(p_record->'acceptanceCriteria') < 1 then
    raise exception 'Mission must include acceptance criteria.';
  end if;
  if jsonb_typeof(p_record->'events') is distinct from 'array' then
    raise exception 'New missions require an initial queued event array.';
  end if;
  if jsonb_array_length(p_record->'events') <> 1 then
    raise exception 'New missions require exactly one initial queued event.';
  end if;

  v_event := p_record->'events'->0;
  if v_event->>'type' is distinct from 'mission_queued'
     or v_event->>'sequence' is distinct from '1'
     or v_event->>'missionId' is distinct from p_record->>'missionId'
     or v_event->>'runId' is distinct from p_record->>'runId'
     or coalesce(v_event->>'eventId', '') = ''
     or coalesce(v_event->>'actorId', '') = '' then
    raise exception 'Initial mission event is invalid or does not match the mission/run.';
  end if;

  insert into public.pruden_missions (
    mission_id, owner_id, requester_id, objective, deadline_at, status,
    assigned_agent_ids, acceptance_criteria, dependencies, subtasks,
    created_at, updated_at, started_at, finished_at
  ) values (
    p_record->>'missionId', v_owner_id, p_record->>'requesterId', p_record->>'objective',
    nullif(p_record->>'deadlineAt', '')::timestamptz, 'queued',
    p_record->'assignedAgentIds', p_record->'acceptanceCriteria',
    coalesce(p_record->'dependencies', '[]'::jsonb), coalesce(p_record->'subtasks', '[]'::jsonb),
    coalesce(nullif(p_record->>'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p_record->>'updatedAt', '')::timestamptz, now()),
    nullif(p_record->>'startedAt', '')::timestamptz,
    nullif(p_record->>'finishedAt', '')::timestamptz
  ) returning * into v_mission;

  insert into public.pruden_mission_runs (
    run_id, mission_id, owner_id, run_number, status, executor_agent_ids,
    outputs, errors, evidence, approval_id, blocker, verification,
    created_at, updated_at, started_at, finished_at
  ) values (
    p_record->>'runId', v_mission.mission_id, v_owner_id, 1, 'queued',
    coalesce(p_record->'executorAgentIds', '[]'::jsonb),
    coalesce(p_record->'outputs', '[]'::jsonb),
    coalesce(p_record->'errors', '[]'::jsonb),
    coalesce(p_record->'evidence', '[]'::jsonb),
    p_record->>'approvalId',
    nullif(p_record->'blocker', 'null'::jsonb),
    nullif(p_record->'verification', 'null'::jsonb),
    v_mission.created_at, v_mission.updated_at,
    v_mission.started_at, v_mission.finished_at
  ) returning * into v_run;

  insert into public.pruden_mission_events (
    event_id, mission_id, run_id, owner_id, sequence, event_type, actor_id,
    agent_id, tool_name, resource_ref, outcome, summary, evidence_ref, occurred_at
  ) values (
    v_event->>'eventId', v_mission.mission_id, v_run.run_id, v_owner_id, 1,
    'mission_queued', v_owner_id::text, null, null,
    v_event->>'resourceRef', v_event->>'outcome', v_event->>'summary', v_event->>'evidenceRef',
    coalesce(nullif(v_event->>'occurredAt', '')::timestamptz, now())
  ) returning * into v_event_row;

  return jsonb_build_object(
    'mission', to_jsonb(v_mission),
    'run', to_jsonb(v_run),
    'event', to_jsonb(v_event_row)
  );
end;
$$;

create or replace function public.pruden_append_mission_note(
  p_mission_id text,
  p_run_id text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_status text;
  v_sequence integer;
  v_event_row public.pruden_mission_events%rowtype;
  v_occurred_at timestamptz := now();
begin
  if v_owner_id is null then
    raise exception 'Authenticated owner session is required.';
  end if;
  if p_note is null or char_length(btrim(p_note)) not between 1 and 1000 then
    raise exception 'Mission note must contain 1 to 1000 characters.';
  end if;

  select r.status
    into v_status
    from public.pruden_mission_runs r
   where r.mission_id = p_mission_id
     and r.run_id = p_run_id
     and r.owner_id = v_owner_id
   for update;
  if not found then
    raise exception 'Mission run was not found in the authenticated owner workspace.';
  end if;
  if v_status in ('failed', 'verified_complete') then
    raise exception 'Cannot append notes after a terminal mission run state.';
  end if;

  select coalesce(max(sequence), 0) + 1
    into v_sequence
    from public.pruden_mission_events
   where run_id = p_run_id and owner_id = v_owner_id;

  insert into public.pruden_mission_events (
    event_id, mission_id, run_id, owner_id, sequence, event_type, actor_id, summary, occurred_at
  ) values (
    gen_random_uuid()::text, p_mission_id, p_run_id, v_owner_id, v_sequence,
    'mission_note', v_owner_id::text, btrim(p_note), v_occurred_at
  ) returning * into v_event_row;

  update public.pruden_mission_runs
     set updated_at = greatest(updated_at, v_occurred_at)
   where run_id = p_run_id and owner_id = v_owner_id;
  update public.pruden_missions
     set updated_at = greatest(updated_at, v_occurred_at)
   where mission_id = p_mission_id and owner_id = v_owner_id;

  return to_jsonb(v_event_row);
end;
$$;

revoke all on function public.pruden_create_mission(jsonb) from public, anon;
revoke all on function public.pruden_append_mission_note(text, text, text) from public, anon;
grant execute on function public.pruden_create_mission(jsonb) to authenticated;
grant execute on function public.pruden_append_mission_note(text, text, text) to authenticated;

comment on table public.pruden_missions is 'Owner-scoped PTMS v2 mission objectives, assignments, deadlines, dependencies, subtasks, and lifecycle state.';
comment on table public.pruden_mission_runs is 'Persistent execution attempts for a mission; model output alone never implies verified completion.';
comment on table public.pruden_mission_events is 'Append-only mission/run activity ledger. Raw tool arguments, credentials, and raw provider payloads must not be stored here.';
comment on function public.pruden_create_mission(jsonb) is 'Atomically creates an owner-scoped queued mission, first run, and initial mission_queued event using auth.uid().';
comment on function public.pruden_append_mission_note(text, text, text) is 'Appends an authenticated owner note with a database-assigned sequence. Agent/tool events remain unavailable until the PTMS execution gateway can authenticate them.';
