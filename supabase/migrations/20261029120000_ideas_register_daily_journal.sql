-- PTMS Ideas Register enrichment + Ivy Daily Journal
-- Additive only: preserves existing ideas, savings goals, and Finance ledger records.

create table if not exists public.pruden_daily_journal (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  timezone text not null default 'Africa/Nairobi',
  summary text not null default '',
  completed_work text not null default '',
  idea_updates text not null default '',
  decisions_lessons text not null default '',
  financial_notes text not null default '',
  blockers text not null default '',
  next_actions text not null default '',
  source_activity jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual','ivy','scheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, journal_date)
);

create index if not exists pruden_daily_journal_owner_date_idx
  on public.pruden_daily_journal (owner_id, journal_date desc);

alter table public.pruden_daily_journal enable row level security;

drop policy if exists pruden_daily_journal_select_own on public.pruden_daily_journal;
create policy pruden_daily_journal_select_own on public.pruden_daily_journal
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists pruden_daily_journal_insert_own on public.pruden_daily_journal;
create policy pruden_daily_journal_insert_own on public.pruden_daily_journal
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists pruden_daily_journal_update_own on public.pruden_daily_journal;
create policy pruden_daily_journal_update_own on public.pruden_daily_journal
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists pruden_daily_journal_delete_own on public.pruden_daily_journal;
create policy pruden_daily_journal_delete_own on public.pruden_daily_journal
  for delete to authenticated using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.pruden_daily_journal to authenticated;

create table if not exists public.pruden_daily_journal_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  status text not null check (status in ('started','completed','failed','skipped')),
  trigger_source text not null default 'scheduled' check (trigger_source in ('scheduled','manual','retry')),
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, journal_date, trigger_source)
);

create index if not exists pruden_daily_journal_runs_owner_date_idx
  on public.pruden_daily_journal_runs (owner_id, journal_date desc);

alter table public.pruden_daily_journal_runs enable row level security;
drop policy if exists pruden_daily_journal_runs_select_own on public.pruden_daily_journal_runs;
create policy pruden_daily_journal_runs_select_own on public.pruden_daily_journal_runs
  for select to authenticated using (owner_id = (select auth.uid()));
grant select on public.pruden_daily_journal_runs to authenticated;
