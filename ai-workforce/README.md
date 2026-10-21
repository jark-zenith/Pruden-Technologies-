# PRUDEN TECHNOLOGIES AI Workforce

The canonical agent registry lives in `agents.json`. The workforce API and dashboard are integrated into PRUDEN Command:

- `server/ai-workforce.mjs` registers the server-side workforce endpoints.
- `src/AIWorkforcePage.tsx` provides the roster, reporting hierarchy, agent profiles, and task console.
- `src/workforce.css` styles the workforce interface.
- `src/App.tsx` connects the module to the existing dashboard navigation.

## Runtime and security

The workforce reuses the existing server-side `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` configuration. Agent identities are role-specific instructions, not separate paid API accounts. The key must stay in the hosting provider's private environment and must never be exposed to browser code or committed to Git.

The API is registered behind PRUDEN Command's existing server access gate. It provides:

- `GET /api/workforce/status` — provider configuration and safe readiness metadata.
- `GET /api/workforce/agents` — the approved registry and controls.
- `POST /api/workforce/run` — run a bounded text-only task for a selected agent.

The runtime has no tools for live browsing, email, WhatsApp, GitHub mutation, database changes, purchases, contracts, or deployment. Outreach can be drafted but not sent. Production releases, spending, scope changes, and permission expansion remain Founder-approved. Requests are rate-limited and logs omit task content.

## Verification and rollout

A GitHub Actions workflow checks JavaScript syntax, registry structure, and the Vite/TypeScript production build. Before public release, confirm the existing Claude key and selected model are valid in the host environment, deploy to the chosen workspace, then test `/health`, `/api/workforce/status`, agent listing, and a harmless task using an authorized account. A configured key does not by itself prove model access or a successful live inference.

No secret should be pasted into ChatGPT or committed to the repository.
