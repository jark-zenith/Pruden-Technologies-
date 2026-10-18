# PRUDEN Command backend

## Access and authentication
The private Node/Express deployment serves the React app only after a successful master-secret unlock. Configure `COMMAND_ACCESS_SECRET` as a private Render environment variable with at least 24 characters. Never put it in GitHub, frontend variables, HTML, or chat. The server never sends it to the browser. Unlock issues an HttpOnly, Secure, SameSite=Strict cookie that expires after 8 hours. Failed attempts are rate-limited per IP in process memory. If the secret is missing or too short, the application fails closed.

After unlocking, users sign in with Supabase Auth email/password. The browser uses only the Supabase project URL and publishable key. RLS scopes management records to the authenticated user. Enable self-service signup only on the private master-secret-gated deployment using `VITE_ALLOW_SIGNUP=true`; keep it false on public static deployments. Users who need email confirmation must confirm their email before signing in.

A shared master secret is a front-door gate, not individual identity. Supabase Auth provides user identity and RLS provides record isolation. Rotate the master secret to revoke the shared gate; manage individual accounts in Supabase Auth.

## Database
The PRUDEN Command core schema is configured on the dedicated project `imvseouxtstgcbizwolm` (`https://imvseouxtstgcbizwolm.supabase.co`). The core tables are:
- `pruden_projects`
- `pruden_tasks`
- `pruden_customers`
- `pruden_decisions`
- `pruden_risks`
- `pruden_approvals`
- `pruden_audit_events`

All seven tables have RLS enabled. Project, task, customer, decision, risk and approval records are owner-scoped. Audit events are insertable and readable by their owner; updates/deletes are not granted. The operational UI currently reads projects, tasks and approvals and persists project/task creation, task status changes and audit events. Finance, customer, decision, risk and AI workforce screens remain follow-up implementation work; do not treat them as live until their UI flows are connected.

## Render configuration
Set these build-time variables on each frontend deployment:
- `VITE_SUPABASE_URL=https://imvseouxtstgcbizwolm.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = the project's publishable key
- `VITE_ALLOW_SIGNUP=true` only on the private deployment protected by `COMMAND_ACCESS_SECRET`; use `false` on public static deployments.

Private web service build/start commands:
- Build: `npm install && npm run build`
- Start: `npm start`
- Health endpoint: `/health`
- Required private variable: `COMMAND_ACCESS_SECRET` (24+ characters)

Never put a Supabase service-role/secret key in browser code or a `VITE_` variable. Configure Supabase Auth email confirmation and allowed site URLs for the deployed domains.

## Email connectors
Email integration is a later phase. Use provider-specific OAuth, least-privilege scopes, explicit mailbox selection, server-side token storage, and human approval before sending mail.
