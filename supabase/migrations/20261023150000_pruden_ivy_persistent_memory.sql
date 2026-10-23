-- Persistent, founder-scoped memory for Ivy.
-- Memory is private to the authenticated owner and accessed only through their user-scoped session.
create table if not exists public.pruden_ivy_memory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null check (memory_type in ('project_decision','responsibility','verified_result','blocker','preference','project_context')),
  project_name text not null default '',
  title text not null check (char_length(trim(title)) between 1 and 200),
  content text not null check (char_length(trim(content)) between 1 and 6000),
  status text not null default 'active' check (status in ('active','superseded','resolved','archived')),
  source text not null default 'founder_or_ivy' check (source in ('founder','founder_or_ivy','verified_tool_result')),
  evidence text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pruden_ivy_memory_owner_status_idx
  on public.pruden_ivy_memory(owner_id, status, updated_at desc);
create index if not exists pruden_ivy_memory_owner_project_idx
  on public.pruden_ivy_memory(owner_id, project_name, updated_at desc);
alter table public.pruden_ivy_memory enable row level security;
drop policy if exists "owner manages own ivy memory" on public.pruden_ivy_memory;
create policy "owner manages own ivy memory"
  on public.pruden_ivy_memory for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
