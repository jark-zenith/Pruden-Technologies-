# PTMS AI Workforce — Composio Tool & Responsibility Matrix

**Status:** Capability design and activation plan; not a runtime permission grant  
**Registry:** `ai-workforce/agents.json` (Ivy + 13 specialists, six departments)  
**Target activation window:** 7 days from approval  
**Primary rule:** A listed integration is a recommended assignment, not proof that PTMS can call it. Only server-side adapters with verified credentials, scoped permissions, tests, audit events, and post-action verification count as live tools.

**2026-11-18 registry checkpoint:** `main` currently declares `toolsEnabled: true` and `externalActionsEnabled: true`. These are policy switches, not proof of credentials or usable integrations. GitHub writes still require a server-side token, an exact repository write allowlist, and non-default feature branches; repository creation has a separate environment gate. Atlas/Nova research still requires `TAVILY_API_KEY`. This snapshot does not grant new permissions or change production.

**Research exposure rule:** Atlas/Nova research tool definitions are exposed only when the global `toolsEnabled` switch is on and `TAVILY_API_KEY` is present. Missing research credentials must remove the tools from the model-visible allowlist and appear as `blocked_missing_TAVILY_API_KEY`; a configured key still requires a live smoke test before the capability is marked verified.

## 1. Current-state audit

Repository: `jark-zenith/Pruden-Technologies-`, default branch `main`.  
PTMS web service: `pruden-command-secure` on Render.  
PTMS Supabase project: `Pruden Technologies` (`imvseouxtstgcbizwolm`).

Verified from the repository:
- The workforce registry contains 14 identities across six departments.
- Agent role definitions and bounded model-run budgets exist.
- Atlas and Nova have a read-only research tool path when `TAVILY_API_KEY` is configured.
- GitHub tools exist for Ivy, engineering specialists, and Sentinel, subject to `GITHUB_TOKEN`, repository allowlists, and write allowlists.
- Ivy has a separate media/image-generation route family, but those routes are not exposed as specialist tools through `availableToolNamesForAgent`; do not count them as Lumi execution access.
- Ivy has separate PTMS operations, Gmail, journal, memory, media, and GitHub modules.
- The specialist runtime does not currently have a general Composio adapter. The Node package manifest does not include a Composio SDK/runtime dependency.
- `agents.json` on `main` declares `toolsEnabled: true` and `externalActionsEnabled: true`. Effective access is still narrower: GitHub requires `GITHUB_TOKEN`, `PRUDEN_GITHUB_REPOS`, and (for writes) `PRUDEN_GITHUB_WRITE_REPOS` plus feature-branch checks; research requires `TAVILY_API_KEY`. Render environment values were not inspected.
- The workforce shared thread is in process memory and is not durable task history.
- PTMS database tables already include tasks, projects, approvals, audit events, ideas, journal, CRM, finance, and notifications. These are not automatically exposed as specialist tools.

Verified Composio-side connection snapshot — 2026-11-18 (ChatGPT session only):

| Toolkit | Session connection | Scope / limitation observed |
|---|---|---|
| GitHub | Active private connection | Repository, branch, tree, file, PR and commit tools discovered |
| Supabase | Two active private accounts; account selection required | Exact PTMS ref `imvseouxtstgcbizwolm` was verified on one account; the other account returned 403. Use only the verified account for PTMS reads |
| Render | Active private connection | Service, deploy, event and log inspection tools discovered; no production mutation |
| Gmail | Active private connection | Profile and message search/read tools discovered; external sending remains approval-gated |
| Slack | Active private connection | Authentication and identity tools discovered; message search/posting coverage must be verified separately |
| Google Drive | Active private connection | File search, metadata and download tools discovered; sharing is not approved |
| Notion | Active private connection | Page search and retrieval tools discovered; publishing is not approved |
| Canva | Active private connection | Design listing/creation tools discovered; publishing remains prohibited |
| Canva MCP | Active private connection | Design generation/creation tools discovered; draft/preview only |
| Descript MCP | Active private connection | Project listing and project-agent workflows discovered; publishing remains prohibited |
| ElevenLabs | Instant-account tools only | Only the session allowlist is available: text-to-speech, speech-to-speech, audio isolation and related listed tools. Recheck price/quota before generation |
| Firecrawl | Instant-account tools only | Search/scrape tools are allowlisted; current listing showed $0.007 per basic search and $0.003 per basic page scrape (79% discount). Calls may incur spend |
| Parallel | Instant-account tools only | `PARALLEL_SEARCH_WEB` and `PARALLEL_MAKE_DECISIONS` are allowlisted; current listing showed $0.001 per Fast search (up to 10 results) with a 100% discount. Recheck terms before use |
| Discord | Active private connection | Connection/identity tools discovered; not assigned to a PTMS agent |
| Mistral AI | Instant-account tools only | OCR tool only |

Connection status is time-sensitive and must be rechecked before execution. These connections are available to this ChatGPT/Composio session only. They are not verified as available to the PTMS Render server.

**Important boundary:** The checked PTMS source has no Composio SDK/runtime dependency or server-side adapter. The Render environment was not inspected for secrets, and a ChatGPT-side connection or API key must never be reused as a PTMS credential. PTMS needs its own server-side Composio project key and authorized connection context. The `/api/ivy/capabilities` response now reports Composio as `not_implemented` until that adapter exists.

## 1.1 Verified PTMS runtime access by role

- **Ivy:** Native PTMS operation tools (owner-scoped projects/tasks/approvals and read-only customer/finance views), memory/journal, capability reporting, and a separate read-only GitHub tool set in Ivy chat. Individual workforce runs can receive additional GitHub tools only when server credentials and repository policies allow them. Native Gmail, Twilio and media routes are separate integrations, not Composio tools; their live configuration remains unverified.
- **Atlas and Nova:** Read-only Tavily search and public-page inspection only when `toolsEnabled` and `TAVILY_API_KEY` are present. A configured key is not a live verification; no PTMS-side search was run in this check.
- **Forge, Pixel, Stack and Vector:** GitHub read tools; feature-branch and PR write tools only with `GITHUB_TOKEN`, `PRUDEN_GITHUB_REPOS`, `PRUDEN_GITHUB_WRITE_REPOS`, both registry switches enabled, and server-side branch validation. Repository creation is separately gated and only exposed to Ivy/Forge.
- **Sentinel:** GitHub read-only tools; independent review remains separate from implementation.
- **Echo, Mira, Lumi, Motion, Relay and Vault:** No specialist tool definitions are currently returned by `availableToolNamesForAgent`; these agents are model-only in the workforce runtime. The existence of Ivy's separate Gmail/media routes or ChatGPT-side Drive/Notion/Canva/Descript/ElevenLabs connections does not grant those agents access.

## 1.2 Verified PTMS mission persistence boundary

The exact `Pruden Technologies` Supabase project is `ACTIVE_HEALTHY`. Its public schema contains 36 tables. The relevant owner-scoped tables are:

- `pruden_tasks`: basic task identity, owner/project, title/description, status/priority, assignee and due date; no mission ID, run ID, subtask/dependency graph or structured acceptance/evidence columns.
- `pruden_approvals`: owner-scoped approval requests and review status; approval rows do not execute actions.
- `pruden_audit_events`: append-oriented event records with JSONB details; RLS exposes owner-scoped SELECT and INSERT only, with no update/delete policy.

The mission contract module validates lifecycle transitions in application memory, while workforce responses still identify `missionStatus: not_created` and `verificationStatus: not_performed`. No dedicated persistent mission/run ledger was found. The live project reports 27 applied migrations (latest version `20261112095508`), while the repository contains 22 SQL migration files and the migration-history reconciliation PR remains open. Do not add or apply another production migration until that drift is reconciled.


## 2. Agent responsibilities and recommended tools

### Executive Office

#### Ivy — AI Chief of Staff
**Mission:** Coordinate the company operating system; translate founder priorities into accountable work; route tasks to the right department; monitor deadlines, blockers, approvals, and evidence; consolidate reports; escalate decisions.

**Recommended tools:**
- PTMS native: projects, tasks, approvals, customers, audit events, journal, workforce status.
- GitHub: repository inventory, tree/file reads, issue/PR status, CI status; controlled feature-branch and PR operations for allowlisted repositories.
- Supabase: narrowly scoped read access to project/task/approval/audit status; no arbitrary SQL or service-role access.
- Render: service/deploy/log read access.
- Gmail: search/read and create drafts; sending only after founder approval.
- Slack: search/read internal context; internal posting only to approved channels.
- Google Drive and Notion: find/read/create/update internal operating documents.
- Composio: orchestrate only the allowlisted tool catalogue; no dynamic privilege escalation.

**KPIs:** priority tasks with owners and due dates; blocker age; approval turnaround; verified completion rate; stale task count; daily workforce report delivery.

**Never:** approve its own permissions, sign contracts, commit budget, send unapproved external outreach, delete financial/customer data, or deploy production.

### Growth & Intelligence

#### Atlas — Director of Opportunity Intelligence
**Mission:** Find and qualify jobs, internships, attachments, tenders, grants, freelance work, partnerships, and potential clients; rank by fit, deadline, evidence, and realistic value.

**Tools:** Parallel web search and page extraction; curated job-site search; official employer/tender source inspection; PTMS Ideas/Tasks for approved opportunity tracking; Google Drive for evidence briefs.

**KPIs:** verified opportunities per week; percentage with original source inspected; deadline/eligibility completeness; opportunity-to-application handoff rate.

**Never:** apply, upload a CV, create accounts, contact employers, promise eligibility, or spend money.

#### Nova — Market Research & Strategy Analyst
**Mission:** Research sectors, competitors, pricing signals, customer segments, demand, and product positioning; turn evidence into recommendations and experiments.

**Tools:** Parallel web search/extraction; official competitor and market pages; Google Drive/Notion research library; PTMS Ideas & Strategy.

**KPIs:** evidence-backed market briefs; competitor coverage; source freshness; testable recommendations accepted.

**Never:** contact prospects, change pricing, or commit budget.

### Client Relations & Business Development

#### Echo — Business Development & Outreach Lead
**Mission:** Qualify leads, design relationship strategies, draft personalized outreach, maintain follow-up discipline, and record outcomes/opt-outs.

**Tools:** PTMS CRM and customer/task records; Gmail search/read and draft creation; Slack internal handoffs; Drive proposal templates; Notion pipeline views.

**KPIs:** qualified leads; response/follow-up coverage; draft turnaround; CRM completeness; opt-out compliance.

**Never:** send external messages without approval, promise price/deadline/scope, or sign contracts.

#### Mira — Client Intake & Requirements Analyst
**Mission:** Convert emails, notes, and client requests into structured briefs, requirements, deliverables, acceptance criteria, dependencies, and clarification questions.

**Tools:** Gmail search/read; Google Drive document read/create; PTMS CRM/projects/tasks/approvals; Notion requirements templates.

**KPIs:** intake-to-brief time; requirements completeness; unresolved questions identified before work starts; avoidable rework.

**Never:** alter approved scope, promise delivery, or share private client information beyond the assigned project.

### Engineering & AI Systems

#### Forge — Director of Software Engineering
**Mission:** Own technical direction, architecture, decomposition, engineering standards, repository allocation, and integration delivery.

**Tools:** GitHub repository/tree/file/commit/issue/PR/CI tools; Render service/deploy/log read tools; Supabase schema and read-only diagnostics; Notion/Drive technical documentation.

**KPIs:** approved milestones delivered; PR review turnaround; regression rate; architecture risks resolved; build/CI pass rate.

**Never:** access non-allowlisted repositories, expose secrets, merge without approval, or deploy production.

#### Pixel — Frontend & Experience Engineer
**Mission:** Own interface architecture, responsive behavior, accessibility, design-system consistency, component implementation, and visual QA.

**Tools:** GitHub feature branches and PRs within approved repositories; Canva design creation/editing and brand-kit reads; browser/page inspection; Drive design specs and assets.

**KPIs:** responsive/accessibility defects; UI acceptance rate; component reuse; visual regression findings.

**Never:** publish or deploy production, change product scope, or expose secrets.

#### Stack — Backend & Integrations Engineer
**Mission:** Own APIs, authentication, data models, database access, third-party integrations, validation, observability, and failure recovery.

**Tools:** GitHub feature branches/PRs; Supabase schema inspection, read-only SQL and migration tooling; Render service/log inspection; approved Composio integration catalogue; API documentation in Drive/Notion.

**KPIs:** integration test pass rate; API error rate; migration safety; incident recurrence; secret-handling findings.

**Never:** run destructive production SQL, change RLS/permissions, rotate secrets, or deploy without approval.

#### Vector — AI & Automation Engineer
**Mission:** Build bounded agent workflows, tool routing, approval gates, scheduled automations, retries, telemetry, and cost controls.

**Tools:** GitHub; Composio tool discovery/allowlist and server-side execution adapter; PTMS task/approval/audit interfaces; Slack internal alerts; Notion workflow specifications; CI tests.

**KPIs:** successful tool execution rate; prevented unauthorized calls; retry/error rates; cost per completed workflow; automation reliability.

**Never:** create unbounded loops, enable unapproved paid services, expand permissions, or expose credentials.

### Quality Assurance & Security

#### Sentinel — QA & Security Lead
**Mission:** Independently verify requirements, code changes, security boundaries, migrations, integration behavior, evidence quality, and release readiness.

**Tools:** Read-only GitHub repository/PR/diff/CI access; Render logs and deploy metadata; Supabase schema and read-only queries; test reports and security checklists.

**KPIs:** escaped defect rate; critical findings resolved before release; coverage of acceptance criteria; independent verification completeness.

**Never:** approve its own release, conceal failures, modify production data, or deploy.

### Pruden Studios

#### Lumi — Creative Director & Brand Designer
**Mission:** Own visual identity, brand consistency, creative concepts, design systems, image generation/editing, and asset specifications.

**Tools:** Existing PTMS Gemini image-generation endpoint; Canva design generation/editing, brand kits, asset upload, and design inspection; Adobe creative tools only if a separate PTMS-compatible integration is authorized; Drive asset library.

**KPIs:** approved creative briefs; brand consistency; asset revision cycles; delivery against creative specifications.

**Never:** use unlicensed assets, publish externally, or order physical printing without approval.

#### Motion — Video & Motion Production Specialist
**Mission:** Own video concepts, scripts, storyboards, edit plans, captions, audio cleanup, voiceovers, motion graphics specifications, and export QA.

**Tools:** Descript project workflows and job status; ElevenLabs transcription, speech synthesis, and audio isolation; Drive media library; Canva for supporting graphics. Runway is a future option only after its connection and cost are verified.

**KPIs:** production-ready briefs; caption/transcript accuracy; export-spec compliance; revision turnaround.

**Never:** publish client content, use unlicensed media, or initiate paid generation without approval.

### Operations & Delivery

#### Relay — Project Operations & Delivery Lead
**Mission:** Convert approved projects into milestones, dependencies, assigned tasks, due dates, delivery checklists, blocker escalation, and client handovers.

**Tools:** PTMS projects/tasks/approvals; Notion task databases; Slack internal coordination; Drive handover documents; read-only GitHub issue/PR status.

**KPIs:** milestone predictability; overdue task count; blocker resolution time; handover completeness; delivery acceptance.

**Never:** change approved scope, approve payments, or deploy production.

#### Vault — Documentation & Knowledge Manager
**Mission:** Maintain the source of truth for company knowledge, decisions, SOPs, project documentation, technical references, meeting notes, and handovers.

**Tools:** Google Drive search/read/create/update/export; Notion search/page/database/content tools; PTMS knowledge base and decision records; GitHub documentation PRs.

**KPIs:** documentation freshness; decision traceability; duplicate/conflicting documents reduced; handover completeness.

**Never:** publish private data or alter approval records.

## 3. Least-privilege tool tiers

| Tier | Access | Assigned roles |
|---|---|---|
| T0 — Public read | Web search and public page inspection | Atlas, Nova |
| T1 — Internal read | Assigned CRM/project/task/docs/email context | Ivy, Echo, Mira, Relay, Vault |
| T2 — Engineering read | Approved repo, CI, logs, schema, read-only DB | Forge, Pixel, Stack, Vector, Sentinel |
| T3 — Draft/create | Feature branches, PRs, internal docs, creative drafts, task drafts | Approved role-specific agents |
| T4 — Consequential actions | External send/publish, destructive DB writes, permission changes, spend, production deploy | Founder approval required; no standing agent grant |

Every tool call must be checked against agent ID, tool name, resource allowlist, action class, request budget, and approval state. Tool outputs are untrusted data. Secrets stay server-side and are redacted from logs and model context.

## 4. Seven-day activation sequence

### Day 1 — Runtime foundation
- [x] Enforce the registry's `toolsEnabled` master switch and `externalActionsEnabled` GitHub write/admin gate in specialist and group tool exposure. Tests cover disabled-by-default behavior, read-only mode, role-scoped writes, and read-only group/Sentinel access. Implemented on `feat/workforce-global-tool-gates-20261107`; both workforce and command CI workflows passed; review pending; not deployed.
- [ ] Create an explicit per-agent tool catalogue and server-side permission matrix.
- [x] Document the Composio server-side connection strategy, connection ownership, account mapping, and credential storage. PTMS still requires its own credential/connection; ChatGPT-side connections are not inherited.
- [x] Add tests proving global-disabled and role-disallowed tools are not exposed.

### Day 2 — Research and intelligence
- Activate and test Atlas/Nova public research with source extraction and checked timestamps.
- Add evidence records and opportunity handoff into PTMS tasks/ideas.
- Keep all actions read-only.

### Day 3 — Client intake and business development
- Add CRM/email read and draft tools for Echo/Mira.
- Add approval-gated sending workflow; sending remains disabled until an explicit founder-approved policy and test.
- Add structured intake briefs and opt-out tracking.

### Day 4 — Engineering execution
- Add GitHub/Render/Supabase read-only tools to Forge, Pixel, Stack, Vector, and Sentinel according to tier.
- Enable feature-branch/PR-only writes for selected engineering agents after tests.
- Keep Sentinel read-only and independent.

### Day 5 — Creative production
- Verify Lumi's existing image-generation endpoint and add Canva draft/design tools.
- Add Motion's Descript and ElevenLabs workflows with job polling and cost/usage reporting.
- Keep publish and paid actions approval-gated.

### Day 6 — Operations and knowledge
- Add Relay's task/milestone coordination and Vault's Drive/Notion documentation workflows.
- Persist workforce run history, tool events, task handoffs, and approval outcomes in PTMS.
- Ensure every room maps to real persisted tasks and handoffs, not just visual presence.

### Day 7 — End-to-end readiness
- Run role-by-role acceptance tests for all 14 identities.
- Test allowed and denied actions, audit trails, timeout/retry behavior, cost limits, and secret redaction.
- Sentinel independently verifies evidence.
- Produce a go-live report and request founder approval before any production deployment or expanded permissions.

## 5. Required runtime architecture

1. **Agent registry:** identities, responsibilities, department, reporting line, allowed tool IDs, denied tool IDs, and action tier.
2. **Tool catalogue:** canonical tool ID, provider/toolkit, schema, read/write classification, cost class, and verification method.
3. **Policy gateway:** enforces agent-to-tool grants, resource allowlists, approval requirements, request limits, and redaction.
4. **Composio adapter:** server-side only; uses PTMS-owned Composio credentials/connection configuration. Do not assume ChatGPT's connected-account session is reusable by PTMS.
5. **Execution ledger:** records run ID, agent ID, tool ID, resource, start/end, status, approval ID, safe output summary, and verification evidence.
6. **Persistent task handoffs:** room messages are context; actual work is a persisted task with owner, status, due date, acceptance criteria, and evidence.
7. **Verification:** writes must be followed by a read-back or provider confirmation. A model response alone never marks a task complete.

## 6. Go-live acceptance criteria

- All 14 agents have explicit mission, responsibilities, allowed tools, denied actions, and KPIs.
- Every enabled tool has a server-side permission check and tests for both allow and deny paths.
- No credentials or access tokens are sent to the browser or logged.
- Each write-capable tool has approval handling, idempotency where supported, and post-action verification.
- Each room shows real persisted task/run status and a visible handoff trail.
- All role-specific smoke tests pass; Sentinel reports findings independently.
- Production deploy and expanded access remain founder-approved actions.

## 7. Known dependencies and cost notes

- PTMS requires its own Composio server-side API credential and authorized connection configuration before PTMS agents can call the Composio-connected accounts. Official Composio docs recommend session-based tool execution for new agents and identify the project API key as the server credential. The current TypeScript SDK documentation requires Node.js 22.22.3 or newer; verify the actual Render Node runtime before choosing the SDK. If the service remains on Node 20, use the documented REST API/session interface or deliberately upgrade the runtime with tests rather than installing an incompatible SDK.
- Existing GitHub, Tavily, Gemini, Gmail OAuth, Render, and Supabase integrations must be tested independently; configured environment variables do not prove live operation.
- Parallel instant search was listed at $0.001 per Fast search (up to 10 results) with a 100% discount in this snapshot; verify current account terms before scaling.
- ElevenLabs is connected through an instant account with a restricted tool allowlist; the current search response did not provide a fresh price, so treat generation as cost-bearing and recheck the quote/quota before use.
- Firecrawl instant search/scrape was listed at $0.007 per basic search and $0.003 per basic page scrape (79% discount); usage may still incur spend. Canva, Descript, Notion, Drive, Slack, GitHub, Supabase, Render, and media access remain subject to account scopes, plans, rate limits, and resource permissions.
- No new paid service or expanded permission should be enabled without founder approval.
