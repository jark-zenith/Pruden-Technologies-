-- PTMS social monitoring: user-owned accounts and metric history.
-- Apply only after reviewing the production impact and reconciling migration history.
create table if not exists public.pruden_social_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('Instagram','TikTok','YouTube','Facebook','LinkedIn','X','Other')),
  handle text not null check (char_length(trim(handle)) between 1 and 160),
  profile_url text,
  goal text not null default 'Audience growth',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pruden_social_accounts_owner_created_idx
  on public.pruden_social_accounts(owner_id, created_at desc);

create table if not exists public.pruden_social_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pruden_social_accounts(id) on delete cascade,
  metric_key text not null check (char_length(trim(metric_key)) between 1 and 80),
  metric_value text not null check (char_length(trim(metric_value)) between 1 and 160),
  note text not null default '',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists pruden_social_metrics_owner_account_recorded_idx
  on public.pruden_social_metrics(owner_id, account_id, recorded_at desc);

alter table public.pruden_social_accounts enable row level security;
alter table public.pruden_social_metrics enable row level security;

drop policy if exists "Owners manage own social accounts" on public.pruden_social_accounts;
create policy "Owners manage own social accounts"
  on public.pruden_social_accounts for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners manage own social metrics" on public.pruden_social_metrics;
create policy "Owners manage own social metrics"
  on public.pruden_social_metrics for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.pruden_social_accounts a
      where a.id = account_id and a.owner_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.pruden_social_accounts to authenticated;
grant select, insert, update, delete on public.pruden_social_metrics to authenticated;
