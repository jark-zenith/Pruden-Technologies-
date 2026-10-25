-- Enable Ivy to record and report owner-scoped finance entries.
-- Capital is a classification only; this does not connect a payment provider or move money.
alter table public.pruden_financial_records
  drop constraint if exists pruden_financial_records_kind_check;

alter table public.pruden_financial_records
  add constraint pruden_financial_records_kind_check
  check (kind in ('capital', 'income', 'expense'));

comment on table public.pruden_financial_records is
  'Owner-scoped manual finance log. Records are informational ledger entries; they do not initiate or verify payments.';
