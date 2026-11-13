-- Add the Home HQ response-verification state without removing existing task states.
-- This migration is reviewed in GitHub only; do not apply to production until migration-history drift is reconciled.

alter table public.pruden_tasks
  drop constraint if exists pruden_tasks_status_check;

alter table public.pruden_tasks
  add constraint pruden_tasks_status_check
  check (status in (
    'planned',
    'in_progress',
    'blocked',
    'completed',
    'cancelled',
    'awaiting_verification'
  ));
