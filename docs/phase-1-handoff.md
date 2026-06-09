# Phase 1 Handoff: PocketBase Schema, Rules, and Seed Importer

## What Was Built

- Added PocketBase JavaScript migrations for:
  - `users` profile extensions: `display_name`, `avatar`
  - `albums`
  - `listens`
  - `reactions`
- Added PocketBase API rules from the PRD:
  - Authenticated members can list/view `users`, `albums`, `listens`, and `reactions`.
  - Album writes are locked to superusers.
  - Listen creates/updates require the record `user` to match `@request.auth.id`.
  - Listen deletes are locked for MVP.
  - Reaction creates/updates/deletes require the record `user` to match `@request.auth.id`.
- Added unique indexes for:
  - `listens(user, album)`
  - `reactions(listen, user)`
  - `albums(rank)`
- Added a CSV/JSON seed importer for owner-supplied RS500 data.
- Added setup documentation for PocketBase env vars, migrations, and importer usage.
- Added `.env.example` with required Phase 1/2 environment variables.

## Key Files and Decisions

- `pb_migrations/1781006400_update_users_profile_fields.js`
  - Extends the built-in `users` auth collection.
  - Uses authenticated list/view rules.
- `pb_migrations/1781006401_create_albums_collection.js`
  - Defines required album metadata fields.
  - Locks create/update/delete to superusers with `null` rules.
  - Enforces idempotent rank identity with a unique `rank` index.
- `pb_migrations/1781006402_create_listens_collection.js`
  - Defines listen ownership, album relation, kind/status selects, rating, take, week, and `rated_at`.
  - Enforces one `(user, album)` row.
  - Does not enforce draw/rating business rules in PocketBase hooks; those remain for Phase 3 trusted server routes/actions.
- `pb_migrations/1781006403_create_reactions_collection.js`
  - Defines one editable reaction/comment per user per listen.
  - Enforces one `(listen, user)` row.
- `scripts/import-albums.mjs`
  - Accepts CSV or JSON.
  - Validates `rank`, `title`, `artist`, `year`, and required `cover_url`.
  - Validates URL fields as `http`/`https`.
  - Parses optional `external_ids`.
  - Fails duplicate ranks within one import file.
  - Detects possible duplicate `(title, artist)` rows and prints a summary.
  - Upserts by `rank`, then reports created, updated, skipped, and failed rows.
  - Includes `--dry-run` and `--validate-only`.
- `docs/pocketbase-setup.md`
  - Documents env vars, migration usage, dataset format, importer commands, and API rule notes.

PocketBase API rule note: current PocketBase treats `null` rules as locked to superusers and empty-string rules as public. Album writes and listen deletes therefore use `null`.

## What Was Verified

- `node --check scripts/import-albums.mjs` passes.
- `npm run import:albums -- --help` prints importer usage.
- `npm run import:albums -- /tmp/rs500-bad-seed.csv --validate-only` rejects a missing `cover_url` row with a clear failed-row summary.
- A fresh temporary PocketBase v0.35.0 instance successfully applied all migrations:
  - `1781006400_update_users_profile_fields.js`
  - `1781006401_create_albums_collection.js`
  - `1781006402_create_listens_collection.js`
  - `1781006403_create_reactions_collection.js`
- `npm run lint` passes.
- `npm run build` passes.

## Known Gaps or Risks

- The owner-supplied RS500 dataset was not available in this session, so importer reruns against real album data were not executed.
- Importer idempotency is implemented by rank and migration verification passed, but a live import/update/skip cycle still needs to be run once PocketBase credentials and the real dataset are available.
- Listen draw/rating invariants from the PRD are intentionally not enforced with client logic or PocketBase hooks in Phase 1. Phase 3 should enforce them in trusted server routes/actions.
- Phase 2 auth should decide how signup is performed against the `users` collection while preserving server-side invite-code validation.

## Recommended Start for Phase 2

Start with invite-gated membership before touching draw behavior:

1. Read `rs500-listening-club-prd.md`, especially sections 2, 5, 7, 8.1, 12, and Phase 2.
2. Read this handoff and `docs/phase-0-handoff.md`.
3. Read the auth design files listed in Phase 2:
   - `design_handoff_rsd500_codex/app/screens-auth.jsx`
   - `design_handoff_rsd500_codex/screens/01-auth.png`
   - `design_handoff_rsd500_codex/app/theme.css`
4. Implement server-side invite-code signup and login/logout/session handling.
5. Do not implement draw, rating, board realtime, catalog behavior, history, or stats yet.

## Copy/Paste Prompt for Next Session

```text
We are working in /Users/jaydreyer/projects/RS500.

Phase 0 and Phase 1 are complete. Read:
- rs500-listening-club-prd.md
- docs/phase-0-handoff.md
- docs/phase-1-handoff.md
- docs/pocketbase-setup.md

Then start Phase 2 from the PRD.

Important Phase 1 context:
- PocketBase migrations exist in pb_migrations/ for users extensions, albums, listens, and reactions.
- API rules are in place for authenticated reads, owner-owned listens/reactions, superuser-only album writes, and locked listen deletes.
- Unique indexes exist for albums(rank), listens(user, album), and reactions(listen, user).
- scripts/import-albums.mjs imports owner-supplied CSV/JSON datasets, validates required fields including cover_url, detects duplicate title/artist rows, fails duplicate ranks, and upserts by rank.
- docs/pocketbase-setup.md documents env vars, migrations, and importer usage.
- Do not implement Phase 3+ draw/rating behavior yet.
- Do not add client-side draw/auth/business-rule enforcement.

Phase 2 goal:
- Implement login.
- Implement signup with server-side invite-code validation against CREW_INVITE_CODE.
- Store/display display_name.
- Add authenticated app layout and logout/session handling.
- Ensure unauthenticated users only see the auth screen.

Phase 1 verification completed:
- node --check scripts/import-albums.mjs passes.
- Importer help works.
- Importer validate-only rejects rows missing cover_url with a clear failed-row summary.
- A fresh temporary PocketBase v0.35.0 instance successfully applied all migrations.
- npm run lint passes.
- npm run build passes.

At the end of Phase 2, write a phase handoff document and include a copy/paste prompt for the next session.
```
