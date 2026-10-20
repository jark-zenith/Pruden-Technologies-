-- Project Operations Center: inventory, integration state, aggregated metrics and operational events.
-- Provider credentials are deliberately excluded from these tables; keep them in server-side secrets.
create table if not exists public.managed_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  repo_full_name text not null,
  repo_url text not null,
  project_name text not null,
  visibility text not null default 'private' check (visibility in ('public', 'private', 'internal')),
  archived boolean not null default false,
  default_branch text not null default 'main',
  lifecycle_status text not null default 'unknown' check (lifecycle_status in ('unknown', 'active', 'paused', 'archived')),
  inventory_source text not null default 'github_render_sync',
  last_inventory_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, repo_full_name)
);

create table if not exists public.managed_project_deployments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.managed_projects(id) on delete cascade,
  provider text not null default 'render',
  provider_service_id text,
  service_name text not null,
  deployment_url text,
  service_type text,
  deployment_branch text,
  provider_state text not null default 'unknown',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider, provider_service_id)
);

create table if not exists public.project_integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.managed_projects(id) on delete cascade,
  provider text not null,
  capability text not null check (capability in ('analytics', 'users', 'activity', 'hosting', 'deployments', 'database', 'storage', 'payments')),
  status text not null default 'not_connected' check (status in ('not_connected', 'needs_credentials', 'connected', 'degraded', 'error', 'disabled')),
  capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  last_error_summary text,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, project_id, provider, capability)
);

create table if not exists public.project_metrics (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.managed_projects(id) on delete cascade,
  provider text not null,
  metric_key text not null,
  metric_value numeric,
  period_start timestamptz not null,
  period_end timestamptz not null,
  dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(dimensions) = 'object'),
  collected_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (owner_id, project_id, provider, metric_key, period_start, period_end, dimensions)
);

create table if not exists public.project_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.managed_projects(id) on delete cascade,
  source text not null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error', 'critical')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists managed_projects_owner_updated_idx on public.managed_projects (owner_id, updated_at desc);
create index if not exists managed_deployments_project_idx on public.managed_project_deployments (owner_id, project_id);
create index if not exists project_integrations_status_idx on public.project_integrations (owner_id, status, provider);
create index if not exists project_metrics_project_period_idx on public.project_metrics (owner_id, project_id, metric_key, period_start desc);
create index if not exists project_events_project_occurred_idx on public.project_events (owner_id, project_id, occurred_at desc);

alter table public.managed_projects enable row level security;
alter table public.managed_project_deployments enable row level security;
alter table public.project_integrations enable row level security;
alter table public.project_metrics enable row level security;
alter table public.project_events enable row level security;

drop policy if exists "Founder owns managed projects" on public.managed_projects;
create policy "Founder owns managed projects" on public.managed_projects
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Founder owns managed deployments" on public.managed_project_deployments;
create policy "Founder owns managed deployments" on public.managed_project_deployments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Founder owns project integrations" on public.project_integrations;
create policy "Founder owns project integrations" on public.project_integrations
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Founder reads project metrics" on public.project_metrics;
create policy "Founder reads project metrics" on public.project_metrics
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Founder reads project events" on public.project_events;
create policy "Founder reads project events" on public.project_events
  for select to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.managed_projects to authenticated;
grant select, insert, update, delete on public.managed_project_deployments to authenticated;
grant select, insert, update, delete on public.project_integrations to authenticated;
grant select on public.project_metrics to authenticated;
grant select on public.project_events to authenticated;
