# PRUDEN HQ: live AI workforce headquarters

The HQ floor is the interactive Home view for PTMS. The floor plan and optional 3D scene are rendered in this page, while PTMS remains the source of truth for workforce and company state.

## Live data sources

- Agent identities and departments: `/api/workforce/agents` (authoritative `ai-workforce/agents.json` registry).
- Current individual agent runs: authenticated `/api/workforce/stream` Server-Sent Events, backed by the PTMS server runtime.
- Tasks, approvals and audit events: owner-scoped Supabase tables (`pruden_tasks`, `pruden_approvals`, `pruden_audit_events`) delivered through Supabase Realtime.
- Application/provider health and read-only finance summary: existing PTMS endpoints and authenticated Supabase queries.

## 2D / 3D controls

- 2D canvas floor plan is the low-resource default.
- 3D view uses Three.js r128 from cdnjs; if the library or WebGL is unavailable, the 2D floor plan remains usable.
- Click agents, room boards, and the central coordination table to inspect live state.
- Agent tasks are submitted to the existing authenticated `/api/workforce/run` route. Approval cards navigate to PTMS Approvals; this view does not bypass approval policy.

## Data integrity and limitations

- No local random task generation or browser-local activity history is used.
- Runtime run events are in process memory and reset when the PTMS server restarts; durable audit events and task/approval records remain in Supabase.
- Agent positions are a visual representation of the current assignment or active run, not physical telemetry. CPU, device and location telemetry are not claimed.
- Supabase Realtime changes are protected by the existing owner-scoped RLS policies.
