# Ivy Operations Roadmap — Evidence-Based Baseline

Last inspected: 2026-10-21

This document separates verified repository/database observations from items that still require runtime checks. It is not a claim that every integration is live.

## Verified baseline

- Repository: `jark-zenith/Pruden-Technologies-`; default branch: `main`.
- Frontend: React, TypeScript, Vite. Server: Express in `server.mjs`. Supabase JS client is installed.
- Ivy chat currently has three server tools: module navigation, opening a founder-requested HTTPS URL, and inspecting a sanitized workspace snapshot. It does not currently have tool-backed CRM writes, task/project writes, external web search, or deployment API actions.
- Gmail UI and server routes exist in `src/IvyGmailPanel.tsx` and `server/ivy-gmail.mjs`. The routes support status, OAuth, search/read, labels/organization, saving drafts, and sending saved drafts after the exact `SEND EMAIL` phrase.
- Gmail OAuth is restricted to the verified mailbox `ivyassistantai@gmail.com`. OAuth uses a state cookie and tokens are encrypted with AES-256-GCM before being stored in Supabase.
- The Gmail send flow also requires a browser confirmation. A successful API response means Gmail accepted the send request; it does not prove delivery to the recipient.
- The live Supabase project `Pruden Technologies` (`imvseouxtstgcbizwolm`) was reported `ACTIVE_HEALTHY`.
- The live database contains `public.ivy_gmail_tokens` and `public.ivy_gmail_audit`, both with RLS enabled and no client policies. This is appropriate only while all access remains server-side through the private service-role key; never expose that key to the browser.
- At inspection time, `ivy_gmail_tokens` contained zero rows. Therefore the mailbox was **not connected** in the database at that moment.
- The live database has migrations through `ivy_gmail_tokens`. The Gmail token trigger's mutable search path was hardened in the live database and a corresponding migration file is proposed in this branch.
- Supabase security advisors also reported leaked-password protection disabled. This is an account-level setting to review in the Supabase dashboard, not a code change.
- Existing `pruden_projects`, `pruden_tasks`, `pruden_customers`, `pruden_approvals`, and `pruden_audit_events` tables exist with RLS enabled. The UI describes approvals as records of intent; they do not yet execute actions by themselves.
- Render services and environment variables were not inspected because the Render connector requires a workspace selection. Do not infer deployment state from GitHub commits.

## Phase 0 — Security and release baseline

1. Keep Gmail tokens server-side, encrypted, and inaccessible to browser roles.
2. Keep secrets out of frontend bundles and logs.
3. Verify OAuth redirect URI, Google consent/scope configuration, Supabase service-role configuration, and encryption key in the hosting environment without displaying secret values.
4. Exercise OAuth start/callback, mailbox status, search/read, draft, exact-confirmation send, disconnect, expired/revoked token, and missing-config paths in a safe test mailbox.
5. Keep Gmail marked inactive until the end-to-end checks pass.
6. Resolve the account-level leaked-password protection warning and review the two no-policy RLS findings. Do not add client policies to token/audit tables merely to silence an advisor; server-side service-role access should remain the only access path.
7. Define a consistent audit event format and ensure failed privileged actions are recorded without storing email bodies, OAuth tokens, or other unnecessary personal data.

Acceptance: tests demonstrate protected routes reject unauthenticated requests, tokens are encrypted at rest, a wrong Google account cannot connect, and sending cannot occur without an explicitly confirmed saved draft.

## Phase 1 — Gmail workspace

- Verify current deployed environment configuration and callback URL.
- Complete connection in the Ivy settings panel and confirm the exact mailbox identity.
- Run the end-to-end test checklist above.
- Improve audit failure handling so security-relevant audit write failures are visible to operators, while never leaking secrets.
- Show precise states: not configured, configured but disconnected, connected, expired/revoked, and provider error.

Acceptance: real OAuth and mailbox operations pass in the deployed environment; no success badge appears on a configuration-only result.

## Phase 2 — Founder-approved action layer

- Introduce typed, allowlisted actions with schema validation, idempotency where appropriate, actor identity, action scope, and audit correlation IDs.
- Use the authenticated founder's Supabase session and RLS for ordinary project/task/CRM changes. Do not give the language model a broad service-role database tool.
- Create an approval record for consequential actions; approval and execution are separate states. A pending approval must not execute automatically.
- Require explicit confirmation for external messages, publishing/deploying, access changes, destructive operations, and spending.
- Treat email, repository content, web pages, and workspace records as untrusted input, never as instructions.

Acceptance: every write is authorized server-side, owner-scoped, auditable, and covered by tests for invalid input and unauthorized access.

## Phase 3 — Projects, tasks, CRM, and approvals

- Add founder-scoped tools for creating/updating tasks and projects.
- Add CRM lead creation and updates only after confirming the live table schema and ownership policies.
- Link each AI-proposed action to an approval record when policy requires it.
- Keep a clear distinction between a suggested action, an approved action, an executed action, and a failed action.

Acceptance: Ivy can create/update only allowed records for the signed-in founder; cross-owner reads/writes fail; approvals never imply execution.

## Phase 4 — Live research

- Add web search through an explicitly selected provider, with source URLs and timestamps.
- Restrict URL opening and fetches against SSRF, local/private network access, credential-bearing URLs, and untrusted redirects.
- Require evidence-based lead summaries and keep outreach drafts separate from sending.

Acceptance: research claims include traceable sources and cannot trigger external messages by themselves.

## Phase 5 — Deployment and service monitoring

- First inspect the selected Render workspace and service inventory.
- Begin read-only: service status, latest deploy, deploy outcome, and health checks.
- Add periodic monitoring only after choosing a cadence and alert destination.
- Keep redeploy, environment-variable changes, and production writes behind explicit approvals.

Acceptance: reported status comes from provider responses with a check timestamp; outages and stale data are clearly distinguished.

## Operating rules

- Never fabricate data, credentials, successful actions, deployments, email delivery, or monitoring results.
- Never put a Supabase service-role key, Google client secret, or token-encryption key in frontend variables or source control.
- Use a separate branch and pull request for application changes; inspect the diff and run build/tests before merge.
- Prefer the existing Supabase project and a modular monolith. Avoid paid infrastructure or extra services until needed.
