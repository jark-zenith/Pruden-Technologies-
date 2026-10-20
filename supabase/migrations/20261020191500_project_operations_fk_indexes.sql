-- Index project_id foreign keys for project-specific dashboard lookups and cascade operations.
create index if not exists managed_project_deployments_project_id_idx on public.managed_project_deployments (project_id);
create index if not exists project_integrations_project_id_idx on public.project_integrations (project_id);
create index if not exists project_metrics_project_id_idx on public.project_metrics (project_id);
create index if not exists project_events_project_id_idx on public.project_events (project_id);
