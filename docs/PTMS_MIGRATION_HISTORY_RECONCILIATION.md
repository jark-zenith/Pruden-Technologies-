# PTMS migration-history reconciliation

**Snapshot:** 15 November 2026, 20:36 Africa/Nairobi  
**Repository:** jark-zenith/Pruden-Technologies-  
**Repository main commit:** 232373c7c9d2bc83aab9a22434343b5c8103332a  
**Supabase project:** Pruden Technologies (imvseouxtstgcbizwolm)

This is a read-only reconciliation snapshot. The project identity was checked before reading the migration history. No other Supabase project was inspected.

## Current comparison

| Measure | Count |
|---|---:|
| SQL migration files in repository | 22 |
| Applied migration-history entries | 27 |
| Shared version keys | 7 |
| Repository-only version keys | 15 |
| Database-only version keys | 20 |
| Same normalized name under different version keys | 12 |
| Semantic name mismatches among shared version keys | 0 |

The shared version 20261112095508 has a redundant timestamp prefix in the database history name (20261112094500_ptms_hq_realtime). Removing that prefix yields the repository name ptms_hq_realtime. The version key itself matches.

## Repository-only versions

These repository files do not have an exact version key in the applied history:

- 20261017000100 — phase_two_company_operations
- 20261017200000 — pruden_command_core
- 20261020190000 — project_operations_center
- 20261020191500 — project_operations_fk_indexes
- 202610210001 — ivy_gmail_tokens
- 20261021150000 — harden_ivy_gmail_token_trigger
- 20261023093000 — pruden_social_monitoring
- 20261023130000 — pruden_command_business_modules
- 20261024190000 — ivy_persistent_memory
- 20261025190000 — ivy_finance_savings_goals
- 20261031190000 — ptms_financial_intelligence_foundation
- 20261031193000 — ptms_financial_intelligence_indexes
- 20261031200000 — lock_financial_account_connection_state
- 20261031210000 — ivy_website_inbox_notifications
- 20261113204800 — allow_awaiting_verification_task_status

## Database-only versions

These applied history entries do not have an exact version key in the repository:

- 20261018173306 — pruden_management_backend
- 20261018181414 — pruden_command_projects
- 20261018181521 — pruden_command_tasks_table
- 20261018181637 — pruden_tasks_owner_policy
- 20261018181724 — pruden_customers_table
- 20261018184937 — pruden_command_core
- 20261019135223 — create_central_website_inbox
- 20261019195809 — moviemax_catalogue
- 20261020151346 — project_operations_center
- 20261020151509 — project_operations_fk_indexes
- 20261021095202 — ivy_gmail_tokens
- 20261021113313 — harden_ivy_gmail_token_trigger
- 20261023092001 — pruden_social_monitoring
- 20261023092517 — pruden_command_business_modules
- 20261025153808 — ivy_finance_savings_goals
- 20261031172517 — ptms_financial_intelligence_foundation
- 20261031172923 — ptms_financial_intelligence_indexes
- 20261031173456 — lock_financial_account_connection_state
- 20261031195951 — ivy_website_inbox_notifications
- 20261107080223 — restrict_ivy_website_notification_trigger

## Same-name, different-version candidates

The following names occur in both sources but under different version keys. They are investigation candidates only; matching names do not prove that two SQL files are semantically equivalent.

| Migration name | Repository version | Applied version |
|---|---|---|
| pruden_command_core | 20261017200000 | 20261018184937 |
| project_operations_center | 20261020190000 | 20261020151346 |
| project_operations_fk_indexes | 20261020191500 | 20261020151509 |
| ivy_gmail_tokens | 202610210001 | 20261021095202 |
| harden_ivy_gmail_token_trigger | 20261021150000 | 20261021113313 |
| pruden_social_monitoring | 20261023093000 | 20261023092001 |
| pruden_command_business_modules | 20261023130000 | 20261023092517 |
| ivy_finance_savings_goals | 20261025190000 | 20261025153808 |
| ptms_financial_intelligence_foundation | 20261031190000 | 20261031172517 |
| ptms_financial_intelligence_indexes | 20261031193000 | 20261031172923 |
| lock_financial_account_connection_state | 20261031200000 | 20261031173456 |
| ivy_website_inbox_notifications | 20261031210000 | 20261031195951 |

## SQL content comparison (16 November 2026)

The 12 same-name/different-version candidates above were compared read-only against the SQL statements returned for the corresponding applied versions in the exact `Pruden Technologies` project. Comparison normalized CRLF line endings, removed full-line `--` comments, and collapsed whitespace; it did not rewrite SQL tokens.

- **11 of 12 pairs match** after that normalization.
- `project_operations_center` and `project_operations_fk_indexes` differ in raw text only because the applied statements omit repository comments and blank lines; normalized SQL matches.
- The only token-level difference is `pruden_social_monitoring` (repository version `20261023093000`, applied version `20261023092001`). The repository RLS `WITH CHECK` expression calls `auth.uid()` directly for the owner checks; the applied statement wraps those calls as `(select auth.uid())`. The ownership predicates remain equivalent. This is consistent with the Supabase RLS scalar-subselect optimization, but it remains a recorded source difference rather than permission to overwrite either version.
- The other nine pairs match after the same normalization.

After accounting for the 12 same-name/version-drift pairs, the remaining unpaired entries are:

- **Repository-only (3):** `phase_two_company_operations` (`20261017000100`), `ivy_persistent_memory` (`20261024190000`), and `allow_awaiting_verification_task_status` (`20261113204800`).
- **Database-only (8):** `pruden_management_backend` (`20261018173306`), `pruden_command_projects` (`20261018181414`), `pruden_command_tasks_table` (`20261018181521`), `pruden_tasks_owner_policy` (`20261018181637`), `pruden_customers_table` (`20261018181724`), `create_central_website_inbox` (`20261019135223`), `moviemax_catalogue` (`20261019195809`), and `restrict_ivy_website_notification_trigger` (`20261107080223`).

The SQL comparison does not establish full schema equivalence for these unpaired entries. No SQL, migration-history record, production schema, or production data was changed. Do not repair or rewrite migration history automatically.

## Read-only audit utility

The script at scripts/migration-history-audit.mjs compares repository filenames with a JSON export of applied migration history. The input can be either an array of migration objects or an object containing a migrations array.

Expected input shape:

    {
      "migrations": [
        { "version": "20261112095508", "name": "ptms_hq_realtime" }
      ]
    }

Run from the repository root:

    node scripts/migration-history-audit.mjs --history-file /secure/path/ptms-migrations.json

An optional --migration-dir argument can point to a different migration directory.

Exit codes:
- 0 — version and normalized-name sets are aligned.
- 1 — differences or invalid repository migration filenames require review.
- 2 — invalid input or an execution error.

The utility does not connect to Supabase, execute SQL, apply migrations, repair history, or delete files. Keep history exports in a secure local path; do not commit access tokens or other credentials.

## Required next steps before any production migration

1. Review every same-name/different-version pair against the actual SQL contents and schema state.
2. Identify historical migrations that were renamed, consolidated, squashed, or removed, with evidence.
3. Decide whether any repository-only migration is safe and necessary to apply.
4. Review the mission-ledger schema and RLS independently.
5. Obtain separate founder approval before any production DDL or migration-history change.

Repository-only does not mean safe to apply. Database-only does not mean safe to delete or rewrite. This report is not an instruction to repair migration history automatically.
