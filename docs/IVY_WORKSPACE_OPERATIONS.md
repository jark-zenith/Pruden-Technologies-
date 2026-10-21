# Ivy Workspace Operations — Initial Implementation

## Implemented on this branch

Ivy's Claude tool loop now includes server-side, allowlisted workspace operations using the currently signed-in Supabase user's access token. The backend verifies that token and issues database queries with the user's JWT, so existing Supabase Row Level Security and owner scoping remain in force. The model never receives a service-role key.

### Read tools
- List the signed-in founder's projects, tasks, approvals, and CRM customers/leads (up to 50 records per call; optional status filters).

### Write tools
- Create projects.
- Create tasks, optionally linked to an existing project owned by the same user.
- Update a task's status.
- Create CRM customer/lead records.
- Create a pending approval request.

Writes validate field lengths, enums, due-date format and project ownership. Successful mutations attempt to append an Ivy audit event. The result warns if the record changed but the audit insert failed.

## Not implemented by this change

This does not yet give Ivy general write access to every navigation module. Finance, products/services, infrastructure, security/audit management, knowledge base, settings, workforce management, website inbox writes, GitHub mutations, deletion, payments, external sending, and deployment actions are not included in this operation allowlist. Some of those modules remain UI scaffolds or use separate integrations.

Approval creation only creates a pending record; it does not execute the associated action. Gmail remains a separate integration with its own explicit send confirmation.

## Security model

- Every operation requires a current Supabase access token from the signed-in UI.
- The backend verifies the token with Supabase Auth and uses the same user JWT for queries, preserving RLS.
- Only named tables and named operations are exposed; there is no arbitrary SQL tool.
- The tool layer never uses a service-role key and never trusts model-provided owner IDs.
- The model must use real record IDs from tool results and must not invent successful actions.
- Production deployment, payment, external communication, deletion, permission changes, and other high-impact operations remain outside this tool allowlist.

## Required verification before calling this live

1. Run `npm run build`.
2. Verify the private Render service has the Supabase URL and publishable/anon key available server-side as `SUPABASE_URL` / `SUPABASE_ANON_KEY` or existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` variables.
3. Test reads and writes with the founder's signed-in account.
4. Test with a different user and verify owner isolation.
5. Verify task/project/customer creation and task status changes in the UI and audit log.
6. Confirm provider API key/configuration and actual deployed version separately. GitHub changes alone do not prove production deployment.
