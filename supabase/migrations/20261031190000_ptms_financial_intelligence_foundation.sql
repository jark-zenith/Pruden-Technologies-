-- PTMS Financial Intelligence foundation.
-- Additive migration: preserves the existing pruden_financial_records ledger.
create table if not exists public.pruden_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null check (char_length(trim(account_name)) between 1 and 120),
  account_type text not null check (account_type in ('mpesa_personal','mpesa_paybill','mpesa_till','bank','cash','payment_gateway','other')),
  account_scope text not null default 'business' check (account_scope in ('personal','business')),
  provider text not null default 'manual' check (provider in ('safaricom_daraja','bank_import','manual','paystack','other')),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  masked_identifier text,
  provider_account_reference text,
  status text not null default 'pending_setup' check (status in ('pending_setup','sandbox_ready','connected','paused','disconnected')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider, provider_account_reference)
);
create index if not exists pruden_financial_accounts_owner_idx on public.pruden_financial_accounts(owner_id, created_at desc);

create table if not exists public.pruden_financial_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.pruden_financial_accounts(id) on delete set null,
  project_id uuid references public.pruden_projects(id) on delete set null,
  kind text not null check (kind in ('income','expense','transfer_in','transfer_out','refund','fee','adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  category text not null check (char_length(trim(category)) between 1 and 100),
  description text not null default '',
  occurred_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual','daraja_stk','daraja_c2b','daraja_b2c','statement_import','project_webhook','bank_import','other')),
  status text not null default 'recorded' check (status in ('pending','confirmed','recorded','failed','reversed','needs_review')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','provider_verified','statement_matched','manually_reviewed')),
  external_reference text,
  idempotency_key text,
  related_transaction_id uuid references public.pruden_financial_transactions(id) on delete set null,
  project_reference text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, idempotency_key)
);
create index if not exists pruden_financial_transactions_owner_date_idx on public.pruden_financial_transactions(owner_id, occurred_at desc);
create index if not exists pruden_financial_transactions_project_idx on public.pruden_financial_transactions(project_id, occurred_at desc);
create index if not exists pruden_financial_transactions_account_idx on public.pruden_financial_transactions(account_id, occurred_at desc);
create unique index if not exists pruden_financial_transactions_external_ref_idx on public.pruden_financial_transactions(owner_id, source, external_reference) where external_reference is not null;

create table if not exists public.pruden_financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.pruden_financial_transactions(id) on delete restrict,
  account_id uuid references public.pruden_financial_accounts(id) on delete set null,
  project_id uuid references public.pruden_projects(id) on delete set null,
  entry_side text not null check (entry_side in ('debit','credit')),
  ledger_account text not null check (char_length(trim(ledger_account)) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists pruden_financial_ledger_entries_tx_idx on public.pruden_financial_ledger_entries(transaction_id);
create index if not exists pruden_financial_ledger_entries_owner_idx on public.pruden_financial_ledger_entries(owner_id, created_at desc);

create table if not exists public.pruden_financial_budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.pruden_projects(id) on delete set null,
  category text not null check (char_length(trim(category)) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  period text not null default 'monthly' check (period in ('weekly','monthly','quarterly','yearly')),
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index if not exists pruden_financial_budgets_owner_idx on public.pruden_financial_budgets(owner_id, status, starts_on desc);

create table if not exists public.pruden_financial_integration_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('safaricom_daraja','project_webhook','statement_import','other')),
  event_type text not null,
  provider_event_id text,
  idempotency_key text,
  processing_status text not null default 'received' check (processing_status in ('received','verified','processed','rejected','failed','needs_review')),
  signature_valid boolean,
  payload_digest text,
  safe_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_payload) = 'object'),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, provider_event_id)
);
create index if not exists pruden_financial_integration_events_owner_idx on public.pruden_financial_integration_events(owner_id, received_at desc);

-- Link the legacy manual ledger to accounts/projects without rewriting existing records.
alter table public.pruden_financial_records
  add column if not exists account_id uuid references public.pruden_financial_accounts(id) on delete set null,
  add column if not exists project_id uuid references public.pruden_projects(id) on delete set null,
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified','provider_verified','statement_matched','manually_reviewed'));

create index if not exists pruden_financial_records_project_idx on public.pruden_financial_records(project_id, occurred_on desc);
create index if not exists pruden_financial_records_account_idx on public.pruden_financial_records(account_id, occurred_on desc);

-- Owner-scoped access for the authenticated dashboard. Provider callbacks use the server service role.
do $$
declare t text;
begin
  foreach t in array array[
    'pruden_financial_accounts',
    'pruden_financial_transactions',
    'pruden_financial_ledger_entries',
    'pruden_financial_budgets',
    'pruden_financial_integration_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner manages own financial data" on public.%I', t);
    execute format('create policy "owner manages own financial data" on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;

-- Prevent direct client mutation of verified provider-sourced history through the existing legacy ledger.
-- RLS remains owner-scoped; immutability for provider-confirmed rows is enforced by backend workflow and audit.
