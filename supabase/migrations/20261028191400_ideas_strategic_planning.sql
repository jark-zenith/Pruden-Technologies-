-- PTMS Ideas & Strategic Planning
-- Additive owner-scoped tables. Does not modify existing project, task, or Finance rows.

create extension if not exists pgcrypto;

create table if not exists public.pruden_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  source text not null default 'manual' check (source in ('manual', 'ivy', 'workforce')),
  category text not null default 'product',
  priority text not null default 'P2' check (priority in ('P0', 'P1', 'P2', 'P3')),
  time_horizon text not null default 'short_term' check (time_horizon in ('immediate', 'short_term', 'mid_term', 'long_term')),
  expected_value text not null default '',
  estimated_cost_kes numeric(12,2) check (estimated_cost_kes is null or estimated_cost_kes >= 0),
  evidence text not null default '',
  risks text not null default '',
  strategic_fit text not null default 'innovation',
  review_status text not null default 'new' check (review_status in ('new', 'under_review', 'needs_information', 'reviewed')),
  decision_status text not null default 'pending' check (decision_status in ('pending', 'approved', 'rejected', 'deferred')),
  implementation_status text not null default 'not_planned' check (implementation_status in ('not_planned', 'planned', 'in_progress', 'blocked', 'completed')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pruden_initiatives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid not null references public.pruden_ideas(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  objective text not null default '',
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'blocked', 'completed', 'cancelled')),
  owner_label text not null default 'Founder',
  target_date date,
  estimated_budget_kes numeric(12,2) check (estimated_budget_kes is null or estimated_budget_kes >= 0),
  approved_budget_kes numeric(12,2) check (approved_budget_kes is null or approved_budget_kes >= 0),
  success_criteria text not null default '',
  linked_project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idea_id)
);

create index if not exists pruden_ideas_owner_updated_idx
  on public.pruden_ideas (owner_id, updated_at desc);
create index if not exists pruden_ideas_owner_priority_idx
  on public.pruden_ideas (owner_id, priority, decision_status);
create index if not exists pruden_initiatives_owner_updated_idx
  on public.pruden_initiatives (owner_id, updated_at desc);
create index if not exists pruden_initiatives_idea_idx
  on public.pruden_initiatives (idea_id);
create index if not exists pruden_initiatives_project_idx
  on public.pruden_initiatives (linked_project_id);

alter table public.pruden_ideas enable row level security;
alter table public.pruden_initiatives enable row level security;

drop policy if exists pruden_ideas_select_own on public.pruden_ideas;
create policy pruden_ideas_select_own on public.pruden_ideas
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists pruden_ideas_insert_own on public.pruden_ideas;
create policy pruden_ideas_insert_own on public.pruden_ideas
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists pruden_ideas_update_own on public.pruden_ideas;
create policy pruden_ideas_update_own on public.pruden_ideas
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists pruden_ideas_delete_own on public.pruden_ideas;
create policy pruden_ideas_delete_own on public.pruden_ideas
  for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists pruden_initiatives_select_own on public.pruden_initiatives;
create policy pruden_initiatives_select_own on public.pruden_initiatives
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists pruden_initiatives_insert_own on public.pruden_initiatives;
create policy pruden_initiatives_insert_own on public.pruden_initiatives
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.pruden_ideas i
      where i.id = pruden_initiatives.idea_id and i.owner_id = (select auth.uid())
    )
  );
drop policy if exists pruden_initiatives_update_own on public.pruden_initiatives;
create policy pruden_initiatives_update_own on public.pruden_initiatives
  for update to authenticated using (owner_id = (select auth.uid())) with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.pruden_ideas i
      where i.id = pruden_initiatives.idea_id and i.owner_id = (select auth.uid())
    )
  );
drop policy if exists pruden_initiatives_delete_own on public.pruden_initiatives;
create policy pruden_initiatives_delete_own on public.pruden_initiatives
  for delete to authenticated using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.pruden_ideas to authenticated;
grant select, insert, update, delete on public.pruden_initiatives to authenticated;
