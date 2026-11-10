// Ivy's model-visible operation allowlist. Finance and customer mutations stay disabled
// until a server-side approval gateway validates an explicit founder approval.
export const IVY_ALLOWED_OPERATION_NAMES = new Set([
  "list_projects",
  "list_tasks",
  "list_approvals",
  "list_customers",
  "list_website_inbox",
  "create_project",
  "create_task",
  "create_idea",
  "list_finance_records",
  "get_finance_record",
  "get_finance_summary",
  "list_financial_accounts",
  "list_financial_transactions",
  "request_approval"
]);
