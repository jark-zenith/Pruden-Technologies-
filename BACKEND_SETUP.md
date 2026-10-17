# PRUDEN Command backend

## Master-secret access gate
The Node/Express host serves the React app only after a successful master-secret unlock. Configure `COMMAND_ACCESS_SECRET` as a private Render environment variable with at least 24 characters. Never put the secret in GitHub, frontend variables, HTML, or chat. The server never sends it to the browser. Unlock issues an HttpOnly, Secure, SameSite=Strict cookie that expires after 8 hours. Failed attempts are rate-limited per IP in process memory. If the secret is missing or too short, the application fails closed.

A shared secret means everyone who knows it has the same access; it does not identify individual users or allow per-person revocation. Rotate the secret to revoke existing sessions. Store it in a password manager.

## Database foundation
The migration `supabase/migrations/20261017200000_pruden_command_core.sql` defines projects, tasks, customers, decisions, risks, approvals and audit events with Row Level Security. It is intentionally not applied to either existing Supabase project.

## Deployment
- Build: `npm install && npm run build`
- Start: `npm start`
- Health endpoint: `/health`
- Required environment variable: `COMMAND_ACCESS_SECRET` (24+ characters)
- Configure a dedicated Supabase project separately before applying the migration. Never use a service-role key in browser code.

## Email connectors
Email integration is a later phase. Use provider-specific OAuth, least-privilege scopes, explicit mailbox selection, server-side token storage, and human approval before sending mail.
