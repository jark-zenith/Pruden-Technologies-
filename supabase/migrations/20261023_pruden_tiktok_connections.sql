create table if not exists public.pruden_tiktok_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null unique references public.pruden_social_accounts(id) on delete cascade,
  encrypted_tokens text not null,
  token_iv text not null,
  token_tag text not null,
  scopes text[] not null default '{}',
  open_id text,
  display_name text,
  expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.pruden_tiktok_connections enable row level security;
revoke all on public.pruden_tiktok_connections from anon, authenticated;
grant all on public.pruden_tiktok_connections to service_role;
create index if not exists pruden_tiktok_connections_owner_id_idx on public.pruden_tiktok_connections(owner_id);
create index if not exists pruden_tiktok_connections_account_id_idx on public.pruden_tiktok_connections(account_id);
