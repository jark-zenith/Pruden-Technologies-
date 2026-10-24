-- Durable, private memories for Ivy in PRUDEN Command.
-- Apply this migration to the dedicated PRUDEN Supabase project.
create table if not exists public.pruden_ivy_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null check (char_length(trim(memory_key)) between 2 and 100),
  category text not null default 'other' check (category in ('preference','identity','project','decision','goal','workflow','other')),
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, memory_key)
);
create index if not exists pruden_ivy_memories_owner_updated_idx
  on public.pruden_ivy_memories(owner_id, updated_at desc);
alter table public.pruden_ivy_memories enable row level security;
drop policy if exists "owner manages own Ivy memories" on public.pruden_ivy_memories;
create policy "owner manages own Ivy memories"
  on public.pruden_ivy_memories for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.pruden_ivy_memories to authenticated;
create or replace function public.pruden_ivy_memories_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists pruden_ivy_memories_updated_at on public.pruden_ivy_memories;
create trigger pruden_ivy_memories_updated_at
before update on public.pruden_ivy_memories
for each row execute function public.pruden_ivy_memories_set_updated_at();
comment on table public.pruden_ivy_memories is 'Private, user-owned durable facts/preferences for Ivy; never store credentials or sensitive personal data.';
