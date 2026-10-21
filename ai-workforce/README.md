# PRUDEN TECHNOLOGIES AI Workforce

The approved workforce registry lives in `ai-workforce/agents.json`. The workforce dashboard is integrated into PRUDEN Command.

## Ivy: current real capabilities

- Claude-powered conversation, with the Anthropic key kept server-side.
- Workspace operations scoped to the signed-in founder: list projects, tasks, approvals and CRM records; create projects/tasks/customers; update task status; create pending approval records.
- Gmail has a separate OAuth connection panel supporting mailbox operations and explicit send confirmation. Confirm the Gmail panel reports connected before relying on it.
- Optional read-only GitHub inspection through `server/ivy-github.mjs`: list visible repositories; inspect repository metadata, branches, recent commits, recursive file trees, and text file contents (40 KB per file maximum); and list/read issues and pull requests. Repository access is restricted by `PRUDEN_GITHUB_REPOS`. All GitHub operations remain read-only.
- A live capability registry at `GET /api/ivy/capabilities`, surfaced in Ivy Settings, distinguishes configured-but-unverified services from integrations that are not implemented.

## Integration configuration

Set secrets only in the private server environment, never in Vite variables or Git:
- `ANTHROPIC_API_KEY` — existing Claude key.
- `GITHUB_TOKEN` — optional GitHub token, scoped to read-only repository metadata, contents, branches, commits, issues, and pull requests for approved repositories.
- `PRUDEN_GITHUB_REPOS` — optional comma-separated allowlist such as `jark-zenith/Pruden-Technologies-`. Defaults to that repository only.

A token being present is not proof of successful authentication. The capability registry uses `configured_unverified` until a real request verifies it.

## Not yet implemented

- WhatsApp Business messaging.
- Payment execution or payment-provider integration.
- Electronic contract signing.
- Ivy-controlled production deployments.
- GitHub write operations such as editing files, opening PRs, merging, or changing repository settings.

Ivy may draft content or create a pending approval record, but must never claim an external action succeeded without a verified provider result. Consequential actions require Founder approval and an auditable execution path.

## Workforce runtime

The AI Workforce module contains 13 specialist identities across six departments, plus Ivy as Chief of Staff (14 identities total) and allows text-only role-specific task runs through the server-side Claude API. Those specialist runs do not yet have external tools. They cannot independently browse, send messages, modify repositories, change databases, spend money, or deploy.

## Verification and rollout

GitHub Actions checks JavaScript syntax, registry structure, and the TypeScript/Vite production build. Before release, run CI, deploy only to the explicitly selected environment, verify the existing Claude key/model, and test a harmless Ivy task plus the read-only GitHub adapter if configured. Do not paste secrets into chat or commit them.
