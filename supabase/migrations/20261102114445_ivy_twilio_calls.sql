-- Ivy / Twilio call history. Server-only access: no authenticated client policies are granted.
create table if not exists public.pruden_ivy_calls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 2500),
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  source text not null default 'ptms_manual_or_approved_trigger',
  destination_number text not null,
  twilio_call_sid text unique,
  status text not null default 'queued',
  callback_digit text check (callback_digit in ('1','2') or callback_digit is null),
  callback_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  provider_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pruden_ivy_calls_created_at_idx
  on public.pruden_ivy_calls (created_at desc);
alter table public.pruden_ivy_calls enable row level security;
revoke all on public.pruden_ivy_calls from anon, authenticated;
grant all on public.pruden_ivy_calls to service_role;
