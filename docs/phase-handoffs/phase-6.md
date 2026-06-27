# Phase 6 Handoff - History and Stats

Status: Complete

## Goal

Build the long-term listening history scorecard, per-member detail, and lightweight crew stats.

## Completed Work

- Built real `/history` scorecard from PocketBase listens and users.
- Added newest-first review columns based on logged fresh picks.
- Added album detail links, cover art, album title, and score/listening state per history cell.
- Added per-member detail view at `/history?member=<id>`.
- Included both fresh picks and already-heard skips in member detail.
- Built real `/stats` cards and sections from listen data.
- Added harshest rater, most generous rater, most albums logged, skip counts, highest-rated albums, lowest-rated albums, and shared-album score comparisons.
- Applied the configured sample threshold of 3 rated fresh listens for harshest and most generous rater.

## Key Files and Decisions

- `../../lib/history.ts`
  - Shared server-only mapper and derived-stat builder for Phase 6.
- `../../app/(club)/history/page.tsx`
  - Server-rendered History scorecard and query-param member detail.
- `../../app/(club)/stats/page.tsx`
  - Server-rendered Stats page derived from the shared Phase 6 state.

Decisions:

- History scorecard cells show only `kind = fresh` listens.
- Member detail and skip stats include both `fresh` and `skip` listens.
- Harshest/most-generous calculations use rated fresh listens only.
- Album high/low and shared-album comparisons use all rated logs.

## Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- Browser check confirmed unauthenticated `/history` redirects to `/auth`.
- Browser check confirmed unauthenticated `/stats` redirects to `/auth`.

## Known Gaps and Risks

- Authenticated History and Stats browsing was not live-tested against seeded PocketBase data because no authenticated browser session was available.
- Album stat sections currently show up to 5 entries each.

## Recommended Start for Phase 7

Read `../../docs/phase-6-handoff.md`, then begin final visual QA and MVP acceptance testing from `../../rs500-listening-club-prd.md`.
