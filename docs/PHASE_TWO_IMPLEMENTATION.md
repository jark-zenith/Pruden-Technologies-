# Phase 2 — Company operations foundation

**Status: implementation scaffold; not yet connected to a live Supabase project.**

## Goal
Move PRUDEN Command from browser-local demo records toward authenticated, persistent company operations while keeping the current dashboard intact.

## Initial modules
- Organizations and member roles: `founder`, `admin`, `finance`, `manager`, `member`, `viewer`.
- Customers / leads.
- Projects and task assignments.
- Finance ledger records in KES by default.
- Row-level security (RLS) to isolate organizations and restrict finance data to finance-capable roles.

## Files
- `supabase/migrations/20261017000100_phase_two_company_operations.sql`: initial schema, indexes, RLS policies, and updated-at triggers.
- `src/lib/supabase.ts` (next implementation step): browser client using public environment variables only.
- `src/lib/company-operations.ts` (next implementation step): typed, validated data access layer.
- Login and onboarding UI (next implementation step): sign-in, organization bootstrap, and session handling.

## Setup required before live testing
1. Create or select the intended Supabase project.
2. Review and apply the migration to a **development** project first.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in local development and the deployment environment. The anon/publishable key is intended for client use only when RLS is correctly enforced.
4. Never put a Supabase service-role key, database password, or provider secret in `VITE_*` variables or frontend code.
5. Add auth UI and wire it to the typed data layer; verify organization isolation using at least two test users before production.
6. Run a restore/recovery check and document account deletion, retention, and access revocation before handling real customer data.

## Security boundaries
- The SQL enables RLS on every application table.
- Organization data is scoped by membership; finance records are only visible/editable to founder, admin, and finance roles.
- The ledger is for internal operational tracking. It does not initiate payments, verify provider callbacks, or replace accounting/tax advice.
- The first founder membership must be created after the organization is created; test this bootstrap flow in development before inviting others.
- This migration has not been applied to any database by this commit. A successful frontend CI build will not prove database correctness; run it against a disposable development project and test policies before live use.

## Acceptance criteria
- Unauthenticated requests cannot read or write organization records.
- A user cannot read or mutate another organization's customers, projects, tasks, or finance entries.
- Members without a finance role cannot read or write finance entries.
- A user cannot self-assign founder/admin roles in an organization they do not own.
- Dashboard data loads from the API only after authentication; browser-local demo tasks remain clearly labeled until migration is complete.
- Build/type checks pass and login, logout, expired sessions, and access-denied states are manually tested.
