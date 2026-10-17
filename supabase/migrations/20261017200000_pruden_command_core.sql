-- PRUDEN Command: first persistent operations backend.
-- Apply only to the dedicated PRUDEN Supabase project, not a shared product database.
create extension if not exists pgcrypto;

create table if not exists public.pruden_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  status text not null default 'planned' check (status in ('planned','active','blocked','completed','archived')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pruden_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.pruden_projects(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  status text not null default 'planned' check (status in ('planned','in_progress','blocked','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  assigned_to text not null default 'Founder',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pruden_customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  email text,
  phone text,
  organization text,
  notes text not null default '',
  status text not null default 'lead' check (status in ('lead','active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pruden_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  context text not null default '',
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  decision text,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','superseded')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pruden_risks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  likelihood text not null default 'medium' check (likelihood in ('low','medium','high')),
  impact text not null default 'medium' check (impact in ('low','medium','high','critical')),
  mitigation text not null default '',
  status text not null default 'open' check (status in ('open','mitigating','accepted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pruden_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (char_length(trim(action_type)) between 1 and 80),
  target_type text not null,
  target_id uuid,
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','executed')),
  requested_by text not null default 'Founder',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pruden_audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  outcome text not null default 'success' check (outcome in ('success','failure','blocked')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pruden_projects_owner_updated_idx on public.pruden_projects(owner_id, updated_at desc);
create index if not exists pruden_tasks_owner_status_idx on public.pruden_tasks(owner_id, status, created_at desc);
create index if not exists pruden_customers_owner_created_idx on public.pruden_customers(owner_id, created_at desc);
create index if not exists pruden_approvals_owner_status_idx on public.pruden_approvals(owner_id, status, created_at desc);
create index if not exists pruden_audit_owner_created_idx on public.pruden_audit_events(owner_id, created_at desc);

create or replace function public.pruden_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['pruden_projects','pruden_tasks','pruden_customers','pruden_decisions','pruden_risks'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.pruden_set_updated_at()', t);
  end loop;
end $$;

alter table public.pruden_projects enable row level security;
alter table public.pruden_tasks enable row level security;
alter table public.pruden_customers enable row level security;
alter table public.pruden_decisions enable row level security;
alter table public.pruden_risks enable row level security;
alter table public.pruden_approvals enable row level security;
alter table public.pruden_audit_events enable row level security;

do $$ declare t text; begin
  foreach t in array array['pruden_projects','pruden_tasks','pruden_customers','pruden_decisions','pruden_risks','pruden_approvals'] loop
    execute format('drop policy if exists "owner manages own records" on public.%I', t);
    execute format('create policy "owner manages own records" on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;

drop policy if exists "owner reads own audit events" on public.pruden_audit_events;
create policy "owner reads own audit events" on public.pruden_audit_events for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "owner creates own audit events" on public.pruden_audit_events;
create policy "owner creates own audit events" on public.pruden_audit_events for insert to authenticated with check ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.pruden_projects, public.pruden_tasks, public.pruden_customers, public.pruden_decisions, public.pruden_risks, public.pruden_approvals to authenticated;
grant select, insert on public.pruden_audit_events to authenticated;
grant usage, select on sequence public.pruden_audit_events_id_seq to authenticated;

comment on table public.pruden_approvals is 'Human approval queue. Approval records do not themselves execute external actions.';
comment on table public.pruden_audit_events is 'Append-only client-visible audit trail; updates and deletes are intentionally not granted.';
