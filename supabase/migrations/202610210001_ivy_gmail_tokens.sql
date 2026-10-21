-- Ivy's Gmail OAuth tokens are stored encrypted by the application before reaching this table.
-- Never expose this table through the browser or grant anon/authenticated access.
create table if not exists public.ivy_gmail_tokens (
  id text primary key check (id = 'ivy-primary'),
  encrypted_tokens text not null,
  token_iv text not null,
  token_tag text not null,
  updated_at timestamptz not null default now()
);

alter table public.ivy_gmail_tokens enable row level security;
revoke all on table public.ivy_gmail_tokens from anon, authenticated;
grant all on table public.ivy_gmail_tokens to service_role;

create or replace function public.ivy_gmail_tokens_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ivy_gmail_tokens_updated_at on public.ivy_gmail_tokens;
create trigger ivy_gmail_tokens_updated_at
before update on public.ivy_gmail_tokens
for each row execute function public.ivy_gmail_tokens_set_updated_at();

-- Metadata-only audit trail; never store email bodies, access tokens, or refresh tokens here.
create table if not exists public.ivy_gmail_audit (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  mailbox text not null check (mailbox = 'ivyassistantai@gmail.com'),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ivy_gmail_audit enable row level security;
revoke all on table public.ivy_gmail_audit from anon, authenticated;
grant all on table public.ivy_gmail_audit to service_role;
create index if not exists ivy_gmail_audit_created_at_idx on public.ivy_gmail_audit (created_at desc);
