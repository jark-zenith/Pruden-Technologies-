# PTMS AI Workforce — Composio Tool & Responsibility Matrix

**Status:** Capability design and activation plan; not a runtime permission grant  
**Registry:** `ai-workforce/agents.json` (Ivy + 13 specialists, six departments)  
**Target activation window:** 7 days from approval  
**Primary rule:** A listed integration is a recommended assignment, not proof that PTMS can call it. Only server-side adapters with verified credentials, scoped permissions, tests, audit events, and post-action verification count as live tools.

**2026-11-07 activation checkpoint:** The registry currently keeps both global tool switches off. A feature-branch change is enforcing `toolsEnabled` as the master switch and `externalActionsEnabled` as the additional GitHub write/admin gate. This is a fail-closed policy correction only; it does not enable tools, add credentials, or change production.

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
- Lumi has a dedicated server-side image-generation capability when the Gemini image provider is configured.
- Ivy has separate PTMS operations, Gmail, journal, memory, media, and GitHub modules.
- The specialist runtime does not currently have a general Composio adapter. The Node package manifest does not include a Composio SDK/runtime dependency.
- `agents.json` currently declares `toolsEnabled: false` and `externalActionsEnabled: false`; runtime code has narrower, environment-gated capabilities. The registry flag and runtime capability reporting should be reconciled before enabling new grants.
- The workforce shared thread is in process memory and is not durable task history.
- PTMS database tables already include tasks, projects, approvals, audit events, ideas, journal, CRM, finance, and notifications. These are not automatically exposed as specialist tools.

Verified Composio-side connection snapshot — 2026-11-09 (ChatGPT session only):

| Toolkit | Session connection | Scope / limitation observed |
|---|---|---|
| GitHub | Active private connection | Repository, PR, commit and CI tools discovered |
| Supabase MCP | Active private connection | Two connected accounts; account selection is required |
| Supabase | Active private connection | Two connected accounts; account selection is required |
| Render | Active private connection | Read-only service, deploy, event, log and metric tools discovered |
| Parallel | Instant-account tools only | `PARALLEL_SEARCH_WEB` and `PARALLEL_MAKE_DECISIONS` are allowlisted |
| Gmail | Active private connection | Message search/read and draft tools discovered; send tools exist but are not approved for autonomous use |
| Slack | Active private connection | Search/history/thread-read tools discovered; posting is not approved |
| Google Drive | Active private connection | File/folder search, download and draft-creation tools discovered; sharing is not approved |
| Canva | No active connection | Do not assign Canva execution to Pixel or Lumi until a connection is established |
| Descript MCP | Active private connection | Project listing and draft-oriented project tools discovered; publishing remains prohibited |
| ElevenLabs | Instant-account tools only | Speech/audio tools are allowlisted; text-to-speech is listed at $0.08 per 1,000 input characters with no displayed discount |
| Notion | Active private connection | Page/database search and internal draft tools discovered |
| Twilio | Active private connection | Account, number, messaging-service and call-inspection tools discovered; sending remains prohibited |

Connection status is time-sensitive and must be rechecked before execution. An active ChatGPT-side connection does not prove that the same account, scopes, or tools are available to the PTMS server.

**Important boundary:** These connections are available to this ChatGPT/Composio session. They are not yet verified as available to the PTMS Render server or its specialist agents. PTMS needs a separate server-side Composio integration and its own authenticated connection context. Never copy a ChatGPT connector token into PTMS or expose credentials to browser code.

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
- Parallel instant web search reports a rate of $0.001 per Fast search; use a low request budget and verify current account terms before scaling.
- ElevenLabs instant text-to-speech reports $0.08 per 1,000 input characters; keep generation opt-in and usage-bounded.
- Canva, Descript, Notion, Drive, Slack, GitHub, Supabase, and Render access is subject to each connected account's scopes, plan, rate limits, and resource permissions.
- No new paid service or expanded permission should be enabled without founder approval.
