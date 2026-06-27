# Phase 4 Handoff: Live Board and Reactions

## What Was Built

- Replaced the static `/board` placeholder with a current board backed by PocketBase data.
- Added server-side board data loading for members, current fresh listens, expanded albums, and reactions.
- Added the live board card UI with member, cover, title, artist, status, rating, take, Spotify and Apple Music actions, reactions, and comments.
- Added empty member slots, including a current-user "Draw your pick" CTA when the signed-in member has no current fresh pick.
- Added PocketBase realtime subscriptions for current fresh listens and reactions.
- Added a live-event ticker that updates when listen or reaction events arrive.
- Added one editable reaction/comment row per user per listen, saved through a server action.
- Used PocketBase's in-memory `BaseAuthStore` for the browser realtime client so the temporary realtime token is not persisted in browser storage.

## Key Files and Decisions

- `lib/board.ts`
  - Server-only board data mapper.
  - Fetches all authenticated members and current `fresh` listens.
  - Selects the latest current fresh listen per member in the client card projection.
  - Fetches reactions for visible board listens and expands reaction authors.
- `app/(club)/board/page.tsx`
  - Forces dynamic rendering.
  - Uses the authenticated PocketBase session and passes initial board state to the client.
  - Passes the refreshed PocketBase auth token only for realtime subscription auth.
- `components/board-client.tsx`
  - Renders the board grid and live ticker.
  - Subscribes to PocketBase `listens` and `reactions`.
  - Calls `router.refresh()` on realtime events so canonical data stays server-rendered.
  - Provides quick emoji selection plus a short editable comment field.
- `app/(club)/board/actions.ts`
  - Server action for reaction upsert.
  - Validates the target listen is a current fresh listen.
  - Creates or updates only the authenticated member's reaction row.

Important Phase 4 decision: board realtime uses a browser PocketBase client because PocketBase realtime is client-side, but reaction writes still go through a Next.js server action. Draw, random selection, logged-album exclusion, and rating state transitions remain server-owned from Phase 3.

## What Was Verified

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- Existing local dev server on `http://localhost:3000` responds.
- Browser check of `/board` while unauthenticated redirects to `/auth` and renders the auth screen.
- HTTP probe confirms unauthenticated `/board` returns `307 Temporary Redirect` to `/auth`.

## Known Gaps or Risks

- Live authenticated board/reaction flows were not exercised against a real PocketBase instance in this session because no local `.env`, seeded data, or authenticated PocketBase browser session was available.
- Realtime connection success and reaction write behavior still need to be verified with at least two authenticated users against the owner's PocketBase instance.
- The board displays the latest current fresh listen per member. The MVP has no recurring lockout, so a fast user could technically create multiple rated fresh listens in the same legacy draw metadata; only the newest one is shown as the headline board card.
- Reaction quick choices are text tokens (`fire`, `100`, `heart`, `wow`, `eyes`) to stay within the repo's ASCII editing convention.
- Catalog, album detail, history, member detail, and stats remain placeholders by design.

## Recommended Start for Phase 5

Start with the catalog and album detail surfaces, without adding any manual logging or reroll loopholes:

1. Read `rs500-listening-club-prd.md`, especially sections 3, 5, 6, 8.5, 9, 10, 11, 12, and Phase 5.
2. Read `docs/phase-0-handoff.md`, `docs/phase-1-handoff.md`, `docs/phase-2-handoff.md`, `docs/phase-3-handoff.md`, and this handoff.
3. Read the Phase 5 design files:
   - `design_handoff_rsd500_codex/app/screens-catalog.jsx`
   - `design_handoff_rsd500_codex/app/screens-detail.jsx`
   - `design_handoff_rsd500_codex/screens/04-catalog.png`
   - `design_handoff_rsd500_codex/screens/07-album-detail.png`
   - `design_handoff_rsd500_codex/app/theme.css`
4. Build the real PocketBase-backed catalog browser with search, logged/unlogged/heard filters, sortable columns, and responsive mobile table behavior.
5. Build album detail with cover, service links, rank/year, crew average/count, who drew it, and crew thread.
6. Keep draw/random-selection/business-rule enforcement on the server; do not add manual listen creation from catalog or detail.

## Copy/Paste Prompt for Next Session

```text
We are working in /Users/jaydreyer/Documents/RS500.

Phase 0, Phase 1, Phase 2, Phase 3, and Phase 4 are complete. Read:
- rs500-listening-club-prd.md
- docs/phase-0-handoff.md
- docs/phase-1-handoff.md
- docs/phase-2-handoff.md
- docs/phase-3-handoff.md
- docs/phase-4-handoff.md
- docs/pocketbase-setup.md

Then start Phase 5 from the PRD.

Important Phase 4 context:
- /board now renders real current board state from PocketBase via lib/board.ts.
- components/board-client.tsx renders member slots, covers, metadata, status, rating, take, service links, reactions, comments, and the live ticker.
- Board realtime subscribes to PocketBase listens and reactions in the browser using an in-memory BaseAuthStore.
- Realtime events call router.refresh(), keeping the canonical board data server-rendered.
- app/(club)/board/actions.ts owns reaction upsert and only creates/updates the authenticated user's reaction row.
- Draw, random selection, logged-album exclusion, active-pick guards, and rating transitions remain server-owned from Phase 3.
- The board shows the latest current fresh listen per member.

Phase 4 verification completed:
- npm run lint passes.
- npx tsc --noEmit passes.
- npm run build passes.
- Browser check confirmed unauthenticated /board redirects to /auth.
- HTTP probe confirmed /board returns 307 to /auth when unauthenticated.

Phase 4 not fully live-tested:
- No local .env/PocketBase authenticated session/seeded data was available, so authenticated realtime and reaction writes need to be exercised against the owner's PocketBase instance.

Phase 5 goal:
- Build read-only The 500 catalog browser from real PocketBase album/listen data.
- Add search across title and artist.
- Add filters for All, Logged, Unlogged, and Heard.
- Add sortable columns for rank, album/title, artist, year, and user score.
- Add responsive mobile table behavior.
- Build album detail with large cover, service links, rank/year, crew average/count, who drew it, and crew thread.
- Do not add any manual logging, reroll, or draw-bypass behavior.

At the end of Phase 5, write a phase handoff document and include a copy/paste prompt for the next session.
```
