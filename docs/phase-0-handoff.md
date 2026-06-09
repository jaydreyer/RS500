# Phase 0 Handoff: Project Scaffold and Design Tokens

## What Was Built

- Scaffolded a production Next.js App Router app with TypeScript, Tailwind CSS v4, ESLint, and shadcn/ui configuration.
- Mapped the design handoff's Midnight theme into `app/globals.css`, including CSS variables, typography hooks, film grain, sharp radii, hairlines, shadows, scrollbar styling, motion keyframes, and reduced-motion handling.
- Added the authenticated app shell with desktop top navigation and mobile bottom navigation for My Week, The Board, The 500, History, and Stats.
- Added empty production route shells for:
  - `/auth`
  - `/week`
  - `/board`
  - `/catalog`
  - `/history`
  - `/stats`
  - `/albums/[albumId]`
- Added shared UI primitives inspired by the handoff, but rewritten for the production stack:
  - button
  - brand mark
  - avatar
  - score badge
  - rating input
  - reaction row
  - eyebrow labels
  - album cover fallback
- Added config constants for the default rating scale and stats sample threshold.

## Key Files and Architecture Decisions

- `app/layout.tsx`: Root App Router layout, metadata, Google font loading, and global CSS import.
- `app/globals.css`: Tailwind v4 CSS-first theme mapping, design tokens, Midnight default theme, alternate theme variables, base styles, film grain, and animation keyframes.
- `app/(club)/layout.tsx`: Authenticated-area shell wrapper.
- `components/app-shell.tsx`: Client shell that owns active route detection, top nav, bottom nav, current-week label, and avatar placement.
- `lib/navigation.ts`: Single nav item source for both desktop and mobile navigation.
- `lib/config.ts`: Central product constants for `RATING_SCALE`, `STATS_SAMPLE_THRESHOLD`, and the temporary week display label.
- `components/primitives.tsx`: Shared design primitives that later phases can connect to real data.
- `components/ui/button.tsx`: shadcn-style local Button primitive using `class-variance-authority`.
- `components.json`: shadcn/ui project configuration for App Router, TypeScript, Tailwind CSS variables, aliases, and lucide icons.

The design handoff was treated as visual and interaction reference only. The prototype files were not copied as production code.

## What Was Verified

- `npm install` completed and generated `package-lock.json`.
- `npm run lint` passes.
- `npm run build` passes.
- Browser checked locally:
  - `/auth` renders the split invite screen with Midnight styling.
  - `/week` renders the app shell, active nav state, status strip, and idle draw machine.
  - No browser console warnings or errors were observed during the check.

Local dev server is running at:

```text
http://localhost:3000
```

## Known Gaps or Risks

- Phase 0 intentionally includes no PocketBase integration, auth/session handling, draw logic, realtime subscriptions, seed importer, or business rule enforcement.
- Route shells contain static placeholder UI only. Later phases should replace placeholder values with server-backed data.
- `CURRENT_WEEK_LABEL` is a temporary display constant and should be replaced by a real ISO week helper when the draw flow is implemented.
- Album cover fallback is a production-safe visual placeholder, not a substitute for required seeded `cover_url` data.
- shadcn/ui is configured and a local Button primitive exists. Additional shadcn components should be added only as later phases need them.
- `npm audit --audit-level=moderate` reports two moderate advisories through Next's nested `postcss <8.5.10` dependency. The offered `npm audit fix --force` would install `next@9.3.3`, which is a breaking downgrade and should not be applied casually.

## Recommended Starting Point for Phase 1

Start with the PocketBase backend contract before touching UI behavior:

1. Read `rs500-listening-club-prd.md`, especially sections 5, 6, 7, 10, and Phase 1.
2. Create PocketBase migration files for `users` extensions, `albums`, `listens`, and `reactions`.
3. Add collection API rules and uniqueness constraints for `(user, album)` listens and `(listen, user)` reactions.
4. Add the seed importer script and docs for `NEXT_PUBLIC_PB_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, and owner-supplied CSV/JSON input.
5. Verify a fresh PocketBase instance can apply migrations and that importer reruns are idempotent by album `rank`.

## Copy/Paste Prompt for Next Session

```text
We are working in /Users/jaydreyer/projects/RS500.

Phase 0 is complete. Read:
- rs500-listening-club-prd.md
- docs/phase-0-handoff.md

Then start Phase 1 from the PRD.

Important Phase 0 context:
- The production Next.js App Router scaffold exists with TypeScript, Tailwind CSS v4, and shadcn/ui configuration.
- Global Midnight design tokens, typography, film grain, motion keyframes, responsive top/bottom navigation, and static route shells are in place.
- Route shells exist for /auth, /week, /board, /catalog, /history, /stats, and /albums/[albumId].
- Shared UI primitives exist in components/ and config constants exist in lib/config.ts.
- Do not implement Phase 2+ UI behavior yet.
- Do not add client-side draw/auth/business-rule enforcement.

Phase 1 goal:
- Build the PocketBase backend contract.
- Add PocketBase migration files for users extensions, albums, listens, and reactions.
- Add the API rules from the PRD.
- Add uniqueness constraints or equivalent migration logic for (user, album) listens and (listen, user) reactions.
- Add a CSV and/or JSON seed importer for the owner-supplied RS500 dataset.
- Validate required album fields and reject rows missing cover_url.
- Make importer reruns idempotent by album rank.
- Detect possible duplicate (title, artist) rows and print a clear summary of created, updated, skipped, and failed rows.
- Add setup docs for PocketBase environment variables and importer usage.

Verification already completed in Phase 0:
- npm run lint passes.
- npm run build passes.
- Browser checked /auth and /week.

At the end of Phase 1, write a phase handoff document and include a copy/paste prompt for the next session.
```
