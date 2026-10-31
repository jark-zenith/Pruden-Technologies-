-- Account ownership remains user-scoped, but connection state is backend-managed.
drop policy if exists "owner manages own financial data" on public.pruden_financial_accounts;
drop policy if exists "owner reads own financial accounts" on public.pruden_financial_accounts;
drop policy if exists "owner registers own financial accounts" on public.pruden_financial_accounts;
create policy "owner reads own financial accounts" on public.pruden_financial_accounts
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner registers own financial accounts" on public.pruden_financial_accounts
  for insert to authenticated with check ((select auth.uid()) = owner_id);