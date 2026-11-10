# Ivy finance and customer-data access guard

**Status:** Finance and customer/CRM records are read-only through Ivy's model-visible operation allowlist until a server-side approval gateway is implemented and reviewed.

## Currently allowed

- Read owner-scoped finance ledger records and summaries.
- Read registered financial accounts and normalized transactions.
- Read owner-scoped customer/lead records.
- Create a pending approval request. A pending approval record does not execute an action.
- Continue the existing project, task, and idea workflows.

## Explicitly not exposed to Ivy

- `create_finance_record`
- `update_finance_record`
- `delete_finance_record`
- `manage_savings_goal` mutations
- `create_customer`

Some underlying operation handlers remain in `server/ivy-operations.mjs` for future use, but the Ivy server filters model-visible tools through `server/ivy-operation-policy.mjs`. A handler existing in source code is not a grant of access.

## Re-enable criteria

Do not add finance or customer write tools back to Ivy until a server-side policy gateway:

1. Requires a founder-approved record for the exact action and target.
2. Verifies approval ownership, status, scope, expiry, and one-time use.
3. Prevents Ivy from approving its own access or action.
4. Records a tamper-evident audit event.
5. Applies idempotency and performs a read-back verification after execution.
6. Has tests for both allowed and denied paths.

No production records, approvals, or customer/financial data were changed as part of this policy update.
