-- Persistent Ivy memories, private to each authenticated user.
create table if not exists public.pruden_ivy_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null check (char_length(btrim(memory_key)) between 2 and 100),
  category text not null default 'other'
    check (category in ('preference','identity','project','decision','goal','workflow','other')),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pruden_ivy_memories_owner_key_unique unique (owner_id, memory_key)
);

create index if not exists pruden_ivy_memories_owner_updated_idx
  on public.pruden_ivy_memories (owner_id, updated_at desc);

alter table public.pruden_ivy_memories enable row level security;

drop policy if exists "Users can read their own Ivy memories" on public.pruden_ivy_memories;
create policy "Users can read their own Ivy memories"
  on public.pruden_ivy_memories for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can insert their own Ivy memories" on public.pruden_ivy_memories;
create policy "Users can insert their own Ivy memories"
  on public.pruden_ivy_memories for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update their own Ivy memories" on public.pruden_ivy_memories;
create policy "Users can update their own Ivy memories"
  on public.pruden_ivy_memories for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own Ivy memories" on public.pruden_ivy_memories;
create policy "Users can delete their own Ivy memories"
  on public.pruden_ivy_memories for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.pruden_ivy_memories to authenticated;
revoke all on public.pruden_ivy_memories from anon;

create or replace function public.set_pruden_ivy_memories_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pruden_ivy_memories_updated_at on public.pruden_ivy_memories;
create trigger set_pruden_ivy_memories_updated_at
before update on public.pruden_ivy_memories
for each row execute function public.set_pruden_ivy_memories_updated_at();
