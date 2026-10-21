# PRUDEN TECHNOLOGIES AI Workforce Runtime

This folder is an isolated first runtime for the approved workforce registry. It uses one shared Anthropic/Claude API key on the server; agent identities are role-specific system prompts, not separate paid API accounts. Do not put the key in browser code, source control, or client-visible environment variables.

## Included

- The approved 12-specialist roster plus Ivy in `agents.json`.
- Protected `GET /api/agents` registry endpoint.
- Protected `POST /api/agent/run` endpoint for bounded text-only agent tasks.
- `GET /health` readiness check.
- Basic structured server logs for run start, completion, failure, and approval-required outcomes.
- No browser-facing API key, no arbitrary tool execution, and no external side effects.

## Configure

Requires Node.js 20+.

```sh
cd ai-workforce
npm install
export ANTHROPIC_API_KEY="your-server-side-Claude-key"
export WORKFORCE_API_TOKEN="generate-a-long-random-token"
export ANTHROPIC_MODEL="claude-3-5-haiku-latest"
npm start
```

If deploying, set these as private environment variables in the hosting provider. Do not commit actual secrets. Set `WORKFORCE_ALLOWED_ORIGIN` to the exact dashboard origin when browser requests are needed. The API token must be held by a trusted server-side integration; never embed it in a public static HTML page.

## API

- `GET /health` — service status and whether required secrets are configured (never returns secrets).
- `GET /api/agents` — requires `Authorization: Bearer <WORKFORCE_API_TOKEN>`.
- `POST /api/agent/run` — same authorization; JSON body: `{"agentId":"nova","task":"Summarize these market notes: ..."}`.

Tasks that appear to involve sending messages, deploying, spending, contracts, deletion, or access changes are refused with `approval_required`; no such action is performed. The current runtime has no tools, so agents cannot yet browse the internet, send email/WhatsApp messages, operate GitHub, or modify client projects. Those integrations must be added separately with scoped credentials, explicit permissions, audit records, and approval gates.

## Important readiness limitations

This is a controlled initial runtime, not a fully autonomous production workforce. Before public deployment, add durable authentication/session management, rate limiting, persistent audit storage, automated tests, input/output evaluation, and an authenticated backend-to-backend connection from the dashboard. Confirm the configured Claude model is available to the account. The key must exist in the hosting environment; this code cannot discover or reuse a key stored in another app or provider automatically.
