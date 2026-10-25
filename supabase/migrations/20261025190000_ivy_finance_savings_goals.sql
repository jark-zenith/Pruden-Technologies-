-- Ivy Finance read/write support: separate savings goals and capital allocations from income/expense ledger entries.
-- Existing ledger rows are preserved; goals are owner-scoped and protected by RLS.
create table if not exists public.pruden_savings_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '',
  currency text not null default 'KES' check (currency = 'KES'),
  target_amount numeric(14,2) not null check (target_amount >= 0),
  mpesa_amount numeric(14,2) not null default 0 check (mpesa_amount >= 0),
  cash_amount numeric(14,2) not null default 0 check (cash_amount >= 0),
  due_date date,
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pruden_savings_goals_owner_name_unique unique(owner_id, name)
);
create index if not exists pruden_savings_goals_owner_status_idx on public.pruden_savings_goals(owner_id, status);
alter table public.pruden_savings_goals enable row level security;
drop policy if exists "owner manages own savings goals" on public.pruden_savings_goals;
create policy "owner manages own savings goals" on public.pruden_savings_goals
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
