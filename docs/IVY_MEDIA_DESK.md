# Ivy Media Desk

Ivy Media Desk adds authenticated public web search, YouTube discovery, and a dockable YouTube mini-player to PRUDEN Command.

## Server configuration

Set these as private server environment variables in the hosting provider. Do not prefix them with `VITE_`, put them in frontend code, or commit actual values.

- `BRAVE_SEARCH_API_KEY` — optional, enables general web results through Brave Search API.
- `YOUTUBE_API_KEY` — optional, enables YouTube video discovery through YouTube Data API v3.

The feature works without keys but the corresponding provider returns a clear setup message. Configure each provider before testing its real results. YouTube API quotas and provider terms apply.

## API

- `GET /api/ivy/media/status` reports whether each provider is configured.
- `POST /api/ivy/media/search` accepts JSON `{ "query": "…", "kind": "web" | "youtube" }`.

All routes are registered behind PRUDEN Command's existing authenticated API gate. Queries are limited to 180 characters, results to eight per request, and requests to 20 per IP per minute. The server uses fixed provider endpoints and validates all returned URLs as HTTPS. Search responses are private and not cached.

## Player and privacy

The player uses YouTube's privacy-enhanced embed host, validates video IDs, and does not download or proxy video content. Playback may be unavailable for videos whose owners disable embedding. The player is docked in the current dashboard session; no search history is persisted by this feature. Only the submitted query is sent to the selected search provider.

## Verification

Run `npm run typecheck` and `npm run build`. Then configure provider keys on a non-production test environment and verify missing-key errors, valid searches, quota errors, session-gate enforcement, video playback restrictions, dragging, minimize/restore, and narrow-screen layout. Do not treat the feature as live-search ready until real provider calls have passed.
