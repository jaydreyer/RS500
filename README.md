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

Rotate the shared signup code before production use; it is validated server-side.

Run PocketBase with this repo's migrations directory:

```bash
pocketbase serve --dir ./pb_data --migrationsDir /Users/jaydreyer/projects/RS500/pb_migrations
```

Seed albums from the owner-supplied CSV or JSON:

```bash
npm run enrich:reviews -- --dry-run --limit 20
npm run enrich:reviews
npm run import:albums -- --file ./data/rs500.csv --validate-only
npm run import:albums -- --file ./data/rs500.csv --dry-run
npm run import:albums -- --file ./data/rs500.csv
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

Run the local checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The tests cover invite-code validation, draw/rating rule helpers, stats thresholds, and seed importer validation/idempotency. Full realtime and authenticated browser QA still requires a seeded PocketBase instance and at least two user accounts.

## Deployment

Deploy the Next.js app to Vercel with the same environment variables set in Vercel project settings. `NEXT_PUBLIC_PB_URL` should point at the owner's reachable PocketBase URL. Keep `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` server-only.

Before production use:

- Apply all migrations in `pb_migrations/` to the owner's PocketBase instance.
- Import the complete RS500 album dataset with required `cover_url` values.
- Create or invite test members and verify signup, draw, board realtime, catalog, history, stats, and album detail against live data.

See [docs/pocketbase-setup.md](docs/pocketbase-setup.md) for backend details and [docs/mvp-verification-checklist.md](docs/mvp-verification-checklist.md) for the acceptance checklist.
