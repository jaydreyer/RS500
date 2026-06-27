# Phase 7 Handoff - Documentation, Verification, and MVP Polish

Status: Complete with owner-instance QA blockers

## Goal

Make the app deployable, testable, and maintainable. Verify the acceptance criteria, final visual fidelity, setup documentation, and MVP scope boundaries.

## Design Context

Read before implementation:

- `../../design_handoff_rsd500_codex/README.md`
- All screenshots in `../../design_handoff_rsd500_codex/screens/`

## Completed Work

- Added root `README.md` with setup, PocketBase, seeding, verification, and Vercel deployment notes.
- Added `docs/mvp-verification-checklist.md` mapped to the PRD acceptance criteria.
- Added focused Node test coverage for invite-code validation, draw/rating rule helpers, stats thresholds, and seed importer validation/idempotency.
- Extracted pure rule helpers from auth, draw, and history/stats code so they can be tested without a live PocketBase instance.
- Ran local verification and unauthenticated route probes.

## Key Files and Decisions

- `README.md`
  - New operator/developer setup guide.
  - Links to PocketBase setup and MVP verification checklist.
- `docs/mvp-verification-checklist.md`
  - Acceptance criteria are marked Verified or Blocked with evidence.
  - Live owner-instance QA is intentionally marked blocked where it requires seeded data and authenticated sessions.
- `lib/auth-rules.ts`
  - Pure invite-code signup validation shared by server actions and tests.
- `lib/draw-rules.ts`
  - Pure draw/rating helpers for drawable-pool exclusion, active-fresh guard, rating parsing, and take normalization.
- `lib/history-rules.ts`
  - Pure stats aggregation helpers shared by `lib/history.ts` and tests.
- `scripts/import-albums.mjs`
  - Exports validation/idempotency helpers.
  - Keeps CLI behavior guarded so importing it in tests does not run the importer.
- `tests/*.test.mjs`
  - Uses Node's built-in test runner to avoid adding a new test framework.

## Verification

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm test` passes with 11 tests.
- `npm run build` passes.
- Local dev server on `http://localhost:3000` responds.
- HTTP probes confirmed:
  - `/auth` returns `200`.
  - the pick route, `/board`, `/catalog`, `/history`, `/stats`, and `/albums/example` return `307` redirects to `/auth` when unauthenticated.

## Known Gaps and Risks

- Authenticated, seeded PocketBase QA is still blocked until the owner's instance, data, and test accounts are available.
- Board realtime still needs a two-authenticated-session browser check.
- Visual QA across all authenticated screens still needs seeded data; unauthenticated route checks alone cannot prove final fidelity.
- The in-app browser refused local `localhost` and `127.0.0.1` navigation with `ERR_BLOCKED_BY_CLIENT`, so desktop/mobile screenshot comparison could not be completed in this session.

## Final MVP Notes

- No manual logging, reroll, draw bypass, or listen deletion UI was added.
- Phase 7 documentation now makes the deploy path explicit but does not perform deployment.
