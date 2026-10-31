-- Cover foreign-key lookup paths introduced by PTMS Financial Intelligence.
create index if not exists pruden_financial_budgets_project_idx
  on public.pruden_financial_budgets(project_id) where project_id is not null;
create index if not exists pruden_financial_ledger_entries_account_idx
  on public.pruden_financial_ledger_entries(account_id) where account_id is not null;
create index if not exists pruden_financial_ledger_entries_project_idx
  on public.pruden_financial_ledger_entries(project_id) where project_id is not null;
create index if not exists pruden_financial_transactions_related_idx
  on public.pruden_financial_transactions(related_transaction_id) where related_transaction_id is not null;