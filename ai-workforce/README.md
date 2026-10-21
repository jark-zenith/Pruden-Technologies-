# PRUDEN TECHNOLOGIES AI Workforce

The authoritative identity registry is `ai-workforce/agents.json`. Individual role specifications live in `ai-workforce/agents/<agent-id>/SPEC.md`; common coordination rules are in `ai-workforce/shared/coordination-protocol.md`.

The runtime supports individual text chats and a shared Workforce Group chat. The group coordinator can label relevant specialists by name, and individual runs receive recent group-thread context. This is role-aware coordination through one model call, not independent parallel execution by every agent.

The group thread is stored in server process memory (last 30 messages), not a database, and can reset on restart. Conversation mode uses browser speech recognition/speech synthesis when supported; text is always available. The current runtime has no specialist external tools. Live browsing, repository writes, external messaging, database mutations, spending, and deployment remain disabled.

A role specification is not a tool grant. Keep credentials in private host environment variables and require Founder approval for consequential actions. Do not claim unverified integrations or actions are successful.