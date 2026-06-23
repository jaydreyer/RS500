# Spin 500

Invite-only Rolling Stone 500 listening club app built with Next.js App Router and PocketBase.

## Stack

- Next.js, React, TypeScript, Tailwind CSS v4
- PocketBase for auth, albums, listens, and reactions
- Server actions for signup, draw/rating, logout, and reaction writes
- PocketBase realtime for the current-week Board refresh loop

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_PB_URL`: PocketBase URL, for example `http://127.0.0.1:8090`.
- `PB_ADMIN_EMAIL`: PocketBase superuser email for migrations/import/signup.
- `PB_ADMIN_PASSWORD`: PocketBase superuser password.
- `CREW_INVITE_CODE`: Shared invite code for server-side signup validation.
- `SERVER_ACTION_ALLOWED_ORIGINS`: Comma-separated trusted hosts for Next.js Server Actions, for example `localhost:3000` locally and your production app host in deployment.
- `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth web client ID for Google account signup/login.
- `GOOGLE_OAUTH_CLIENT_SECRET`: Google OAuth web client secret.
- `GOOGLE_OAUTH_REDIRECT_URI`: Optional explicit callback URL when request-origin inference does not match the Google OAuth client.

Rotate the shared signup code before production use; it is validated server-side.

For day-to-day local development, start PocketBase and Next.js together:

```bash
npm run dev:local
```

`dev:local` uses `./tmp/pb_dev_data` for local PocketBase data, applies this repo's migrations, creates or updates the configured local superuser, and forces the app process to use `NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090`.

Use a separate development or staging PocketBase instance before applying new migrations to the live club backend. See [docs/dev-pocketbase.md](docs/dev-pocketbase.md).

For Codex/maintenance notes about the owner backend, local CLI fallback, and live schema verification, see [docs/pocketbase-runbook.md](docs/pocketbase-runbook.md).

Seed albums from the owner-supplied CSV or JSON:

```bash
npm run enrich:reviews -- --dry-run --limit 20
npm run enrich:reviews
npm run import:albums -- --file ./data/rs500.csv --validate-only
npm run import:albums -- --file ./data/rs500.csv --dry-run
npm run import:albums -- --file ./data/rs500.csv
```

Or fill a local development backend with the complete RS500 album/artwork dataset plus sample users, listens, reviews, reactions, groups, group draws, feed posts, replies, mentions, and feed read state:

```bash
npm run seed:dev -- --validate-only
npm run seed:dev
```

`seed:dev` refuses non-local PocketBase URLs by default. Keep `NEXT_PUBLIC_PB_URL` pointed at `http://127.0.0.1:8090` or another localhost dev instance before running it.

The sample accounts use the password `spin500-dev`; for example, log in as `maya.dev@example.com`.

To test Google login locally, create a Google OAuth Web application client and add this redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

Then set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `.env.local` and restart the dev server.

If PocketBase is already running and intentionally managed separately, start only the app:

```bash
npm run dev
```

Prefer `npm run dev:local` for normal local work.

Open `http://localhost:3000`.

## Local PR Review

Use the dedicated local review stack before browser QA or PR screenshots:

```bash
npm run review:local
```

`review:local` refuses remote backends. It forces PocketBase to
`http://127.0.0.1:8092`, stores review data in `./tmp/pb_review_data`, enables
the local-only dev login route, seeds the sample data, waits for PocketBase and
Next.js to be reachable, and then runs the review readiness check.

Sample users are seeded with the password `spin500-dev`; for example:

```text
maya.dev@example.com / spin500-dev
```

For Codex screenshots or quick reviewer access while `review:local` is running,
open:

```text
http://localhost:3000/api/dev/login?user=maya
```

The dev login endpoint is disabled unless `ENABLE_DEV_LOGIN=1`, the app is not
running in production, the request host is localhost, and `NEXT_PUBLIC_PB_URL`
also points at localhost. To verify an already-running review stack without
starting it:

```bash
npm run review:check
```

## Verification

Run the local checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The tests cover invite-code validation, draw/rating rule helpers, stats thresholds, and seed importer validation/idempotency. Full realtime and authenticated browser QA still requires a seeded PocketBase instance and at least two user accounts.

## Group Draws

Groups are admin-managed in PocketBase. Create an active `groups` record, then add active `group_members` records for each user. Any active member of an active group will see the group draw panel on `/week`.

A group draw is manual. When a member spins for the group, the server picks one album no active group member has logged, creates one `group_draws` record, and creates one individual fresh `listens` row per member. A group draw is blocked while any active member has an unrated fresh pick; the next group draw unlocks once those active picks are rated.

## Deployment

Deploy the Next.js app to Vercel with the same environment variables set in Vercel project settings. `NEXT_PUBLIC_PB_URL` should point at the owner's reachable PocketBase URL. Keep `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, and `GOOGLE_OAUTH_CLIENT_SECRET` server-only.

For Google login in production, add the deployed callback URL to the Google OAuth client:

```text
https://your-production-domain.com/api/auth/google/callback
```

Before production use:

- Apply all migrations in `pb_migrations/` to the owner's PocketBase instance.
- Import the complete RS500 album dataset with required `cover_url` values.
- Create or invite test members and verify signup, draw, board realtime, catalog, history, stats, and album detail against live data.
- Rehearse schema/rule changes against a non-production PocketBase instance.

See [docs/pocketbase-setup.md](docs/pocketbase-setup.md) for backend details and [docs/mvp-verification-checklist.md](docs/mvp-verification-checklist.md) for the acceptance checklist.
