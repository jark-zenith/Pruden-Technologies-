-- Ivy / Twilio inbound voice and SMS history.
-- All communication records are server-only; no browser roles receive table access.
alter table public.pruden_ivy_calls
  add column if not exists direction text not null default 'outbound'
    check (direction in ('inbound', 'outbound')),
  add column if not exists caller_number text;

create table if not exists public.pruden_ivy_messages (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('inbound', 'outbound')),
  from_number text not null,
  to_number text not null,
  body text not null check (char_length(body) between 1 and 1600),
  status text not null default 'queued',
  twilio_message_sid text unique,
  provider_error_code text,
  source text not null default 'ptms',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pruden_ivy_messages_created_at_idx
  on public.pruden_ivy_messages (created_at desc);
create index if not exists pruden_ivy_messages_direction_created_at_idx
  on public.pruden_ivy_messages (direction, created_at desc);

alter table public.pruden_ivy_calls enable row level security;
alter table public.pruden_ivy_messages enable row level security;
revoke all on public.pruden_ivy_calls from anon, authenticated;
revoke all on public.pruden_ivy_messages from anon, authenticated;
grant all on public.pruden_ivy_calls to service_role;
grant all on public.pruden_ivy_messages to service_role;
