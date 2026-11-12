# PRUDEN HQ: AI workforce simulation (prototype)

A standalone, single-file prototype of the AI Headquarters Home view. It is not wired into the PTMS app and changes nothing in `src/` or `server/`.

## Open it

Open `index.html` in a browser. The only external request is three.js (r128) from cdnjs, used by the 3D view.

## What it shows

- The 14 agents from the AI Workforce registry (Ivy plus 13 specialists) walking a floor plan with rooms, doors, corridors, desks and equipment.
- A 2D / 3D toggle. 3D supports drag to rotate and scroll to zoom.
- Clickable wall screens in every room and a glass table in the meeting area, each opening a live status popup.
- A Founder approvals queue. Forge, Echo and Lumi stop and ask before consequential actions.
- History that survives a reload (browser `localStorage`).

## Honest limits

- Simulation mode: events are generated in the page from the registry, not read from live PTMS.
- Server, device and finance screens show simulated or empty content. No real figures are used.
- Memory is per browser. A shared, durable history needs Supabase tables for runs, handoffs, approvals and events.

## Suggested next steps

1. Add durable event tables in Supabase (agent runs, handoffs, approvals, events) so history survives restarts.
2. Stream real events from the server to this view instead of generating them locally.
3. Port the view into the React app once the event feed exists.
