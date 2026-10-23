-- Persistent business modules for PRUDEN Command.
-- Existing customer, approval and audit tables are reused; no existing records are rewritten.
create table if not exists public.pruden_financial_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  category text not null check (char_length(trim(category)) between 1 and 100),
  description text not null default '',
  occurred_on date not null default current_date,
  source text not null default 'manual' check (source in ('manual','imported','integration')),
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pruden_financial_records_owner_date_idx on public.pruden_financial_records(owner_id, occurred_on desc);
alter table public.pruden_financial_records enable row level security;
drop policy if exists "owner manages own records" on public.pruden_financial_records;
create policy "owner manages own records" on public.pruden_financial_records for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create table if not exists public.pruden_products_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  item_type text not null default 'service' check (item_type in ('product','service')),
  description text not null default '',
  price_kes numeric(14,2) check (price_kes is null or price_kes >= 0),
  status text not null default 'draft' check (status in ('draft','active','paused','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pruden_products_services_owner_status_idx on public.pruden_products_services(owner_id,status);
alter table public.pruden_products_services enable row level security;
drop policy if exists "owner manages own records" on public.pruden_products_services;
create policy "owner manages own records" on public.pruden_products_services for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create table if not exists public.pruden_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  category text not null default 'General',
  tags text[] not null default '{}',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pruden_knowledge_articles_owner_created_idx on public.pruden_knowledge_articles(owner_id,created_at desc);
create index if not exists pruden_knowledge_articles_search_idx on public.pruden_knowledge_articles using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,'')));
alter table public.pruden_knowledge_articles enable row level security;
drop policy if exists "owner manages own records" on public.pruden_knowledge_articles;
create policy "owner manages own records" on public.pruden_knowledge_articles for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
