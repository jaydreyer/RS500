# Phase 3 Handoff: Server-Owned Draw and Rating Flow

## What Was Built

- Added trusted server-side draw and rating logic for the My Pick flow.
- Server draw now selects uniformly from the authenticated user's unlogged album pool.
- Draw creates a `fresh`/`listening` listen immediately so refreshes or repeat draw attempts cannot dodge an unheard pick.
- Added skip rating flow that converts the just-drawn active fresh listen into `kind = skip`, `status = rated`, with `rating`, optional `take`, and `rated_at`.
- Added keep-fresh confirmation that validates the active fresh listen still belongs to the current user.
- Added fresh rating flow that updates an active fresh listen to `status = rated`, sets `rating`, optional `take`, and `rated_at`.
- Replaced the static the pick route placeholder with a real My Pick draw machine backed by PocketBase data.
- Included idle, spinning, presented, skip-rating, kept, blocked/active-pick, and fresh-rating states.
- Updated album covers to render the seeded `cover_url` through `next/image`.
- Added legacy draw metadata helpers for draw metadata labels.

## Key Files and Decisions

- `lib/draw.ts`
  - Server-only Phase 3 rule engine.
  - Fetches the user's logged listens and computes the draw pool server-side.
  - Uses Node `crypto.randomInt` for server-side random selection.
  - Enforces one active fresh pick before allowing a new draw.
  - Owns all skip/fresh rating state transitions.
- `server draw actions`
  - Server actions for draw, keep fresh pick, skip rating, and fresh rating.
  - Uses the authenticated PocketBase session from the HTTP-only cookie.
  - Revalidates the pick route after mutations.
- `draw action state`
  - Shared serializable action state for the client component.
  - Kept out of the `"use server"` module so the server-action file only exports async functions.
- `draw machine component`
  - Client UI for the My Pick machine.
  - Preserves the handoff's record spin/reveal/flip feel and relies on global reduced-motion CSS.
  - Browser state only controls presentation; random selection and mutations remain server-owned.
- `pick route page`
  - Forces dynamic rendering and fetches live pick state for the authenticated user.
- `components/album-cover.tsx`
  - Renders real cover URLs when present, with fallback art still available.
- `lib/auth.ts`
  - Added `getAuthenticatedPocketBase()` so server actions/pages can use a validated PocketBase client and mapped user.
- `legacy draw metadata helper`
  - Added legacy draw metadata key and display label helpers.

Important draw decision: a draw creates the fresh listening row immediately. If the member marks it already heard, the server converts that row into a rated skip. This is stricter than returning an unlogged album to the browser first, because it preserves the no-dodging rule across reloads and repeated requests without adding a new pending-draw collection.

## What Was Verified

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- Existing local dev server on `http://localhost:3000` responds:
  - `/auth` returns `200 OK`.
  - the pick route redirects unauthenticated users to `/auth`.

## Known Gaps or Risks

- Live authenticated draw/skip/keep/rate flows were not exercised against a real PocketBase instance in this session because no local `.env` or running PocketBase auth session was available.
- The in-app browser plugin blocked local HTTP navigation with `ERR_BLOCKED_BY_CLIENT`, so visual verification was limited to build/lint plus HTTP route probes.
- The Phase 3 draw actions rely on the existing Phase 1 PocketBase uniqueness index for `(user, album)` and owner update rules as defense in depth.
- The active fresh row can be converted to a skip through the server action while it is still `fresh/listening`; the UI only exposes that during the just-drawn branch.
- Board realtime, catalog filters, history, member detail, and stats remain placeholders by design.

## Recommended Start for Phase 4

Start with the current board and reactions, without changing draw mechanics:

1. Read `rs500-listening-club-prd.md`, especially sections 5, 6, 7, 8.3, 10, 12, and Phase 4.
2. Read `docs/phase-0-handoff.md`, `docs/phase-1-handoff.md`, `docs/phase-2-handoff.md`, and this handoff.
3. Read the Phase 4 design files:
   - `design_handoff_rsd500_codex/app/screens-board.jsx`
   - `design_handoff_rsd500_codex/app/components.jsx`
   - `design_handoff_rsd500_codex/app/sleeves.jsx`
   - `design_handoff_rsd500_codex/screens/03-board.png`
   - `design_handoff_rsd500_codex/app/theme.css`
4. Build the current Board view from real PocketBase listens/users/albums.
5. Add PocketBase realtime subscriptions for listens and reactions.
6. Implement one editable reaction/comment row per user per listen.

## Copy/Paste Prompt for Next Session

```text
We are working in /Users/jaydreyer/projects/RS500.

Phase 0, Phase 1, Phase 2, and Phase 3 are complete. Read:
- rs500-listening-club-prd.md
- docs/phase-0-handoff.md
- docs/phase-1-handoff.md
- docs/phase-2-handoff.md
- docs/phase-3-handoff.md
- docs/pocketbase-setup.md

Then start Phase 4 from the PRD.

Important Phase 3 context:
- Draw/rating logic is server-owned in lib/draw.ts and server draw actions.
- Browser/client code never chooses the random album and never decides listen state transitions.
- drawAction creates a fresh/listening listen immediately using the authenticated user's unlogged pool.
- keepFreshPickAction validates that the just-drawn listen is still the current user's active fresh pick.
- skipRatingAction converts that active fresh listen into kind=skip/status=rated with rating, optional take, and rated_at.
- freshRatingAction updates the active fresh listen to status=rated with rating, optional take, and rated_at.
- One active fresh pick blocks further draws server-side.
- the pick route renders draw machine component with real PocketBase state.
- Board realtime, catalog, history, member detail, and stats are still placeholders.

Phase 3 verification completed:
- npm run lint passes.
- npx tsc --noEmit passes.
- npm run build passes.
- Local HTTP probe confirmed /auth returns 200 and unauthenticated the pick route redirects to /auth.

Phase 3 not fully live-tested:
- No local .env/PocketBase session was available, so authenticated draw/skip/keep/rate flows still need to be exercised against the owner's PocketBase instance after migrations/data/env are in place.

Phase 4 goal:
- Build current Board view with member, cover, title, artist, status, rating, take, Spotify/Apple Music actions, and reactions/comments.
- Subscribe to PocketBase realtime updates for listens and reactions.
- Implement one editable reaction/comment row per user per listen.
- Keep draw/random-selection/business-rule enforcement on the server; do not move it to the browser.

At the end of Phase 4, write a phase handoff document and include a copy/paste prompt for the next session.
```
