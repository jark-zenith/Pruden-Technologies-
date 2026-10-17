-- Phase 2 foundation: tenant-scoped company operations.
-- Apply through Supabase migrations after reviewing the project and environment.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('founder', 'admin', 'finance', 'manager', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  email text,
  phone text,
  company_name text,
  status text not null default 'lead' check (status in ('lead', 'active', 'inactive')),
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 160),
  description text,
  status text not null default 'planned' check (status in ('planned', 'active', 'blocked', 'completed', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  budget_amount numeric(14,2) check (budget_amount is null or budget_amount >= 0),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Operational ledger only: this does not move money or replace a compliant accounting system.
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  direction text not null check (direction in ('income', 'expense')),
  category text not null check (length(trim(category)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 240),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  occurred_on date not null default current_date,
  status text not null default 'recorded' check (status in ('recorded', 'pending', 'void')),
  reference text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists customers_org_status_idx on public.customers(organization_id, status);
create index if not exists projects_org_status_idx on public.projects(organization_id, status);
create index if not exists tasks_org_status_idx on public.tasks(organization_id, status);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists finance_transactions_org_date_idx on public.finance_transactions(organization_id, occurred_on desc);

-- SECURITY DEFINER helpers avoid recursive RLS evaluation on organization_members.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_creator(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.organizations o
    where o.id = target_org and o.created_by = (select auth.uid())
  );
$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.finance_transactions enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
for select to authenticated using (public.is_org_member(id));

drop policy if exists organizations_create_owner on public.organizations;
create policy organizations_create_owner on public.organizations
for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
for update to authenticated using (public.has_org_role(id, array['founder','admin']))
with check (public.has_org_role(id, array['founder','admin']));

drop policy if exists members_select_self_or_admin on public.organization_members;
create policy members_select_self_or_admin on public.organization_members
for select to authenticated using (
  user_id = (select auth.uid()) or public.has_org_role(organization_id, array['founder','admin'])
);

drop policy if exists members_insert_owner_bootstrap_or_admin on public.organization_members;
create policy members_insert_owner_bootstrap_or_admin on public.organization_members
for insert to authenticated with check (
  (user_id = (select auth.uid()) and role = 'founder' and public.is_org_creator(organization_id))
  or public.has_org_role(organization_id, array['founder'])
  or (public.has_org_role(organization_id, array['admin']) and role in ('finance','manager','member','viewer'))
);

drop policy if exists members_update_admin on public.organization_members;
create policy members_update_admin on public.organization_members
for update to authenticated using (public.has_org_role(organization_id, array['founder']))
with check (public.has_org_role(organization_id, array['founder']));

drop policy if exists members_delete_admin on public.organization_members;
create policy members_delete_admin on public.organization_members
for delete to authenticated using (
  public.has_org_role(organization_id, array['founder']) and user_id <> (select auth.uid())
);

-- Customers and projects: members may read; operational roles may write.
drop policy if exists customers_select_member on public.customers;
create policy customers_select_member on public.customers for select to authenticated
using (public.is_org_member(organization_id));
drop policy if exists customers_insert_manager on public.customers;
create policy customers_insert_manager on public.customers for insert to authenticated
with check (public.has_org_role(organization_id, array['founder','admin','manager']));
drop policy if exists customers_update_manager on public.customers;
create policy customers_update_manager on public.customers for update to authenticated
using (public.has_org_role(organization_id, array['founder','admin','manager']))
with check (public.has_org_role(organization_id, array['founder','admin','manager']));
drop policy if exists customers_delete_admin on public.customers;
create policy customers_delete_admin on public.customers for delete to authenticated
using (public.has_org_role(organization_id, array['founder','admin']));

drop policy if exists projects_select_member on public.projects;
create policy projects_select_member on public.projects for select to authenticated
using (public.is_org_member(organization_id));
drop policy if exists projects_insert_manager on public.projects;
create policy projects_insert_manager on public.projects for insert to authenticated
with check (public.has_org_role(organization_id, array['founder','admin','manager']));
drop policy if exists projects_update_manager on public.projects;
create policy projects_update_manager on public.projects for update to authenticated
using (public.has_org_role(organization_id, array['founder','admin','manager']))
with check (public.has_org_role(organization_id, array['founder','admin','manager']));
drop policy if exists projects_delete_admin on public.projects;
create policy projects_delete_admin on public.projects for delete to authenticated
using (public.has_org_role(organization_id, array['founder','admin']));

-- Tasks: all organization members can read; members/managers can create and update.
drop policy if exists tasks_select_member on public.tasks;
create policy tasks_select_member on public.tasks for select to authenticated
using (public.is_org_member(organization_id));
drop policy if exists tasks_insert_member on public.tasks;
create policy tasks_insert_member on public.tasks for insert to authenticated
with check (public.has_org_role(organization_id, array['founder','admin','manager','member']));
drop policy if exists tasks_update_member on public.tasks;
create policy tasks_update_member on public.tasks for update to authenticated
using (public.has_org_role(organization_id, array['founder','admin','manager','member']))
with check (public.has_org_role(organization_id, array['founder','admin','manager','member']));
drop policy if exists tasks_delete_manager on public.tasks;
create policy tasks_delete_manager on public.tasks for delete to authenticated
using (public.has_org_role(organization_id, array['founder','admin','manager']));

-- Finance is private to founder/admin/finance roles; no delete policy by design.
drop policy if exists finance_select_finance_role on public.finance_transactions;
create policy finance_select_finance_role on public.finance_transactions for select to authenticated
using (public.has_org_role(organization_id, array['founder','admin','finance']));
drop policy if exists finance_insert_finance_role on public.finance_transactions;
create policy finance_insert_finance_role on public.finance_transactions for insert to authenticated
with check (public.has_org_role(organization_id, array['founder','admin','finance']));
drop policy if exists finance_update_finance_role on public.finance_transactions;
create policy finance_update_finance_role on public.finance_transactions for update to authenticated
using (public.has_org_role(organization_id, array['founder','admin','finance']))
with check (public.has_org_role(organization_id, array['founder','admin','finance']));

-- Keep updated_at current on updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['organizations','customers','projects','tasks','finance_transactions'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', tbl);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl);
  end loop;
end;
$$;
