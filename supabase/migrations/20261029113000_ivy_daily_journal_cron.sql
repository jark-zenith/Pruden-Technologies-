-- Reliable daily Ivy journal using Supabase Cron (pg_cron).
-- Runs at 15:00 UTC = 18:00 Africa/Nairobi (Kenya has no daylight-saving changes).
-- Uses owners who already have the Google Play developer savings goal; no owner IDs or secrets are hard-coded.

create extension if not exists pg_cron;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.run_ivy_daily_journal_summary()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_date date := (statement_timestamp() at time zone 'Africa/Nairobi')::date;
  v_start timestamptz;
  v_end timestamptz;
  v_journal_id uuid;
  v_audit_count integer;
  v_task_count integer;
  v_project_count integer;
  v_finance_count integer;
  v_completed text;
  v_tasks text;
  v_projects text;
  v_audit text;
  v_finance text;
  v_summary text;
begin
  v_start := v_date::timestamp at time zone 'Africa/Nairobi';
  v_end := (v_date + 1)::timestamp at time zone 'Africa/Nairobi';

  for v_owner_id in
    select distinct g.owner_id
    from public.pruden_savings_goals g
    where g.name ilike '%Google Play%'
      and g.status <> 'archived'
  loop
    v_journal_id := null;

    if exists (
      select 1 from public.pruden_daily_journal j
      where j.owner_id = v_owner_id and j.journal_date = v_date
    ) then
      insert into public.pruden_daily_journal_runs
        (owner_id, journal_date, status, trigger_source, details, completed_at)
      values
        (v_owner_id, v_date, 'skipped', 'scheduled',
         pg_catalog.jsonb_build_object('reason', 'A manual or Ivy entry already exists for this date.'),
         statement_timestamp())
      on conflict (owner_id, journal_date, trigger_source) do update
        set status = 'skipped', details = excluded.details, completed_at = excluded.completed_at;
      continue;
    end if;

    select count(*),
           coalesce(pg_catalog.string_agg(a.action || ' (' || a.entity_type || ')', E'\n' order by a.created_at), '')
      into v_audit_count, v_audit
    from public.pruden_audit_events a
    where a.owner_id = v_owner_id and a.created_at >= v_start and a.created_at < v_end;

    select count(*),
           coalesce(pg_catalog.string_agg(t.title || ' — ' || t.status, E'\n' order by t.updated_at), ''),
           coalesce(pg_catalog.string_agg(t.title, E'\n' order by t.updated_at) filter (where t.status = 'completed'), '')
      into v_task_count, v_tasks, v_completed
    from public.pruden_tasks t
    where t.owner_id = v_owner_id and t.updated_at >= v_start and t.updated_at < v_end;

    select count(*),
           coalesce(pg_catalog.string_agg(p.name || ' — ' || p.status, E'\n' order by p.updated_at), '')
      into v_project_count, v_projects
    from public.pruden_projects p
    where p.owner_id = v_owner_id and p.updated_at >= v_start and p.updated_at < v_end;

    select count(*),
           coalesce(pg_catalog.string_agg(f.occurred_on::text || ' · ' || f.kind || ' · KES ' || f.amount::text || ' · ' || f.category || case when f.description = '' then '' else ' · ' || f.description end, E'\n' order by f.occurred_on), '')
      into v_finance_count, v_finance
    from public.pruden_financial_records f
    where f.owner_id = v_owner_id and f.occurred_on = v_date;

    v_summary := pg_catalog.format(
      'Automated daily summary for %s (Africa/Nairobi), generated from available PTMS records: %s audit event(s), %s task update(s), %s project update(s), and %s Finance record(s). This does not include external conversations or offline work.',
      v_date, v_audit_count, v_task_count, v_project_count, v_finance_count
    );

    insert into public.pruden_daily_journal
      (owner_id, journal_date, timezone, summary, completed_work, idea_updates,
       decisions_lessons, financial_notes, blockers, next_actions, source_activity, source)
    values
      (v_owner_id, v_date, 'Africa/Nairobi', v_summary,
       case when v_completed <> '' then 'Completed tasks:' || E'\n' || v_completed
            when v_tasks <> '' then 'Task updates:' || E'\n' || v_tasks
            else 'No task updates were found in available PTMS records.' end,
       v_projects,
       v_audit,
       case when v_finance <> '' then v_finance
            else 'No Finance ledger records were found for this date; this does not prove no offline spending occurred.' end,
       '',
       coalesce(nullif(v_tasks, ''), 'Review current tasks and record any blockers or next actions.'),
       pg_catalog.jsonb_build_object('audit_count', v_audit_count, 'task_count', v_task_count,
         'project_count', v_project_count, 'finance_count', v_finance_count),
       'scheduled')
    on conflict (owner_id, journal_date) do nothing
    returning id into v_journal_id;

    if v_journal_id is null then
      insert into public.pruden_daily_journal_runs
        (owner_id, journal_date, status, trigger_source, details, completed_at)
      values
        (v_owner_id, v_date, 'skipped', 'scheduled',
         pg_catalog.jsonb_build_object('reason', 'A concurrent manual/scheduled entry already exists.'),
         statement_timestamp())
      on conflict (owner_id, journal_date, trigger_source) do update
        set status = 'skipped', details = excluded.details, completed_at = excluded.completed_at;
    else
      insert into public.pruden_daily_journal_runs
        (owner_id, journal_date, status, trigger_source, details, completed_at)
      values
        (v_owner_id, v_date, 'completed', 'scheduled',
         pg_catalog.jsonb_build_object('journal_id', v_journal_id, 'audit_count', v_audit_count,
           'task_count', v_task_count, 'project_count', v_project_count, 'finance_count', v_finance_count),
         statement_timestamp())
      on conflict (owner_id, journal_date, trigger_source) do update
        set status = 'completed', details = excluded.details, completed_at = excluded.completed_at;
    end if;
  end loop;
end;
$$;

revoke all on function private.run_ivy_daily_journal_summary() from public, anon, authenticated;

do $$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'ivy-daily-journal-1800-africa-nairobi'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule(
    'ivy-daily-journal-1800-africa-nairobi',
    '0 15 * * *',
    'select private.run_ivy_daily_journal_summary();'
  );
end;
$$;
