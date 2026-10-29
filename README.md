# PRUDEN Command — PTMS

**Build. Learn. Invent. Evolve.**  
A private, owner-scoped management workspace for PRUDEN Technologies, with Ivy as the AI operations assistant.

> **Truth in status:** repository code and migration files document implementation, not proof that production environment variables, database migrations, provider keys, or live deployments are configured. Verify those in the target environment before describing a capability as live.

## What is in this repository

- **PRUDEN Command dashboard:** React + TypeScript + Vite frontend, served by an Express application.
- **Private workspace access:** server-side master-secret gate with an HTTP-only, Secure, SameSite session cookie and request throttling.
- **Ivy assistant:** server-side Anthropic API integration; provider credentials remain on the server.
- **Workspace operations:** owner-scoped Supabase operations for projects, tasks, approvals, and customers.
- **Business modules:** Finance ledger, Customers & CRM, Products & Services, Knowledge Base, Security & Audit, Approvals, and reports.
- **AI Workforce:** registered specialist directory and bounded text delegation.
- **Supporting integrations:** optional GitHub, Gmail, media, research, and persistent-memory modules, each subject to its own configuration and permissions.
- **Android wrapper:** Capacitor configuration and an APK workflow.

## Ivy Finance operations

Ivy's Finance tools operate on persisted Supabase records using the signed-in user's access token and row-level security. The supported operation set includes:

- Read and filter ledger entries; fetch a specific record.
- Create and update income/expense entries; delete a specific entry only after explicit instruction and confirmation.
- Calculate income, expense, and net totals from saved ledger rows.
- Create, list, update, and archive savings goals with separate M-PESA and cash allocations.
- Calculate goal capital total, remaining amount, and progress without counting capital as income.
- Record actions in the audit trail when the audit table and permissions are available.

Finance ledger records use `pruden_financial_records`. Savings goals and their capital allocations use `pruden_savings_goals`; they are intentionally separate from the income/expense ledger. Owner isolation is enforced with authenticated Supabase access and RLS. No service-role key is sent to the browser or model.

**Initial capital target to configure through Ivy after the migration is applied:** goal “Google Play Store Developer Account”; currency KES; M-PESA KSh 700; cash KSh 200; total allocated capital KSh 900; target KSh 3,500; remaining KSh 2,600; progress 25.71%. Before creating, Ivy must inspect existing goals and update an equivalent one rather than duplicate it. These amounts are capital allocations, not new income.

## Technology

- React 18, TypeScript, Vite
- Node.js + Express
- Supabase Auth and Postgres with row-level security
- Anthropic Messages API for Ivy
- Capacitor for Android packaging

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Review `.env.example` and configure only the environment values required by the chosen workflow. Never commit real credentials. For the server-backed workspace, configure the private server environment, including a strong `COMMAND_ACCESS_SECRET` (at least 24 characters), Supabase URL and anon key, and the Anthropic API key if Ivy chat is required. A configured key is not proof of a successful provider request.

Useful commands:

```bash
npm run typecheck
npm run build
npm start
```

The repository currently defines `dev`, `build`, `typecheck`, `start`, and `android:sync` scripts.

## Database setup

Apply the SQL migrations in `supabase/migrations` to the intended Supabase project in chronological order. The Ivy Finance savings-goal migration is additive and does not convert or rewrite existing ledger rows. Verify RLS policies and test with a normal authenticated user before production use.

## Security and operational notes

- Do not place Supabase service-role keys, Anthropic keys, GitHub tokens, or OAuth secrets in frontend variables or source control.
- User-owned records must be queried and mutated under the authenticated owner ID; RLS is an additional boundary, not a substitute for server-side validation.
- Treat AI output and database content as untrusted. Use allowlisted tools, validate inputs, and preserve unrelated fields on partial updates.
- Financial deletes are destructive. Ivy must have explicit user authorization and a precise record target before deleting.
- The audit trail is best-effort unless its write result is checked and the database permissions are configured. A successful business write must not be falsely reported as audited if audit insertion fails.
- Verify the live health endpoint, private unlock flow, Supabase access, Ivy provider request, and production build independently.


## Ideas & Strategic Planning

The Ideas & Strategic Planning module adds owner-scoped idea capture and an initiative roadmap without replacing existing project, task, Finance, approval, or AI Workforce records.

- Manual ideas and Ivy-generated proposals are stored separately by source and are not automatically approved.
- Priorities are P0 (critical), P1 (high), P2 (normal), and P3 (low); time horizons are immediate, short-term, mid-term, and long-term.
- Approving an idea creates an initiative record. Project creation and planning-task creation are explicit user actions.
- Estimated costs and proposed budgets are planning metadata, not Finance ledger entries or proof of available funds.
- Initiative Finance panels can link existing owner-scoped expense records for actual-spend reporting; they never copy or rewrite ledger entries.
- Apply `supabase/migrations/20261028192135_ideas_strategic_planning.sql` to the intended Supabase project before using the module. Verify authenticated-owner RLS policies in the target environment.

## Ideas Register and Ivy Daily Journal

The Ideas Register extends the existing `pruden_ideas` table and seeds these 2026 items idempotently by title when the authenticated founder opens the Daily Journal:
- College/personal development: V.E.T.I Technology and Innovation Club.
- Community/networking: Claude Community Kenya participation and connecting with Billy.
- Savings/long-term goals: a reference idea linked to the existing Google Play developer savings goal. It does not create another savings goal or duplicate Finance transactions.
- Potential income: Kitengela photography, explicitly conditional on a camera loan being confirmed.

Seeded ideas are planning records, not proof of completed outreach, approved college plans, confirmed camera access, or realized income. Review the existing Finance/savings records for current verified amounts.

The **Daily Journal** module stores one entry per owner/date in `pruden_daily_journal`, with `Africa/Nairobi` as its timezone. It supports searching, reviewing/editing entries, and building a draft from PTMS audit events, task updates, and project updates. Ivy's `ivy_journal_activity_today`, `ivy_journal_list`, and `ivy_journal_save` tools use the signed-in user's access token and owner-scoped RLS. Ivy must only report evidence returned by those tools and confirm the returned journal ID. The activity source does not include external conversations or offline work.

Apply `supabase/migrations/20261029112824_ideas_register_daily_journal.sql` after the existing migrations. It adds journal and scheduler-run tables with owner-scoped RLS; it does not rewrite existing idea, savings, or Finance records.

### 6:00 PM Africa/Nairobi scheduled journal

Supabase Cron (`pg_cron`) runs the journal function daily at **15:00 UTC, which is 6:00 PM in Kenya**. Kenya does not observe daylight-saving time. The job is stored in the database and does not depend on the Render web service staying awake or the browser being open.

Apply `supabase/migrations/20261029113025_ivy_daily_journal_cron.sql` after the daily-journal migration. The migration installs `pg_cron`, creates a restricted function in the non-exposed `private` schema, and schedules `private.run_ivy_daily_journal_summary()`. The function only processes owners with an existing, non-archived Google Play developer savings goal, does not hard-code user IDs or secrets, and skips a date if a manual/Ivy journal entry already exists. It records the outcome in `pruden_daily_journal_runs`. The summary is factual and database-derived; it does not include external conversations or offline work.

Verify the job in `cron.job` and inspect `cron.job_run_details` plus `pruden_daily_journal_runs` for execution outcomes. The schedule is configured in the database; the first automatic entry will be created at the next scheduled run if the owner has not already recorded that date.

## Gemini provider

`server/model-providers.mjs` supports Gemini text generation through `GEMINI_API_KEY`. The workforce can use Gemini for text-only tasks when provider selection permits; tool-enabled runs remain on Anthropic until Gemini tool-call execution is implemented and tested. Ivy's normal tool-enabled chat remains on Anthropic; the Ideas module uses a bounded text-only Ivy proposal endpoint that prefers Gemini when configured.

In the private PTMS workspace, **AI Workforce → Test Gemini** sends a minimal live request and reports only success/failure, model, and latency. It never returns or logs the API key. A configured environment variable alone does not prove the key is valid, the model is available, or quota remains. Configure `GEMINI_API_KEY` in the private runtime environment and optionally `GEMINI_MODEL` / `WORKFORCE_TEXT_PROVIDER`; never place credentials in frontend variables or source control.

## Project status

This README describes the repository's code and intended setup. It does not claim that all integrations are configured, the new Finance migration has been applied to production, or a deployed app has passed live read/write tests. Those states must be confirmed in the target environment.
