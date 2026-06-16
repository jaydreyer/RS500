# Development PocketBase

Use a separate PocketBase instance before applying schema or rule changes to the live club backend.

The production-like instance currently used by `.env.local` is `http://ai-lab:8091`. Do not use it as the first target for migrations that change API rules or add indexes.

For the exact live-backend inspection and fallback schema-application workflow used from Codex, see [docs/pocketbase-runbook.md](pocketbase-runbook.md).

## Local Instance

Create a local data directory outside the repo's tracked files:

```bash
mkdir -p ./tmp/pb_dev_data
pocketbase serve --dir ./tmp/pb_dev_data --migrationsDir /Users/jaydreyer/projects/RS500/pb_migrations --http 127.0.0.1:8090
```

Create a local env file that points the app at the dev instance:

```bash
cp .env.example .env.local
```

Use values like:

```dotenv
NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090
PB_ADMIN_EMAIL=owner@example.com
PB_ADMIN_PASSWORD=change-me
CREW_INVITE_CODE=dev-code
SERVER_ACTION_ALLOWED_ORIGINS=localhost:3000,127.0.0.1:3000
```

Create the PocketBase superuser in the dev dashboard, then seed albums:

```bash
npm run import:albums -- --file ./data/rs500-albums.csv --validate-only
npm run import:albums -- --file ./data/rs500-albums.csv
```

For a fuller development sandbox, seed the complete album/artwork dataset and broad sample activity:

```bash
npm run seed:dev -- --validate-only
npm run seed:dev
```

The development seeder authenticates as the PocketBase superuser, upserts all 500 albums from `data/rs500-albums.json`, creates sample users with the password `spin500-dev`, and fills listens/reviews, reactions, groups, group draws, feed posts, feed replies, feed mentions, and feed read state. It is idempotent for the generated sample records, so rerunning it should update the same development data instead of creating another independent sample crew.

## Staging Instance

For a shared staging instance, use a different PocketBase data directory, port, and DNS/tunnel from production. Copy production data only when needed for migration rehearsals, and treat it as sensitive club data.

Recommended staging checks before production:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Then run the app against staging and verify:

- signup and login
- drawing a personal pick
- rating a fresh pick
- logging an already-heard album from album detail
- group draw readiness
- board realtime
- account deactivation

## Preflight Before Applying Hardening Migrations

The listen hardening migration adds a database invariant that allows only one active `fresh/listening` pick per user. Before applying it to an existing database, check for conflicts:

```sql
SELECT user, COUNT(*) AS active_count
FROM listens
WHERE kind = 'fresh' AND status = 'listening'
GROUP BY user
HAVING COUNT(*) > 1;
```

Resolve any rows returned before applying the migration. Usually that means rating the intended active pick and converting stale active rows to `rated` or `skip` by admin decision.

## Production Rule

After the hardening migrations are applied, `listens` writes are server-owned. Members can still read club history, board state, and feed data, but direct PocketBase API writes to `listens` are blocked. The Next.js server actions authenticate the member first, then perform the trusted write.

Deployment order for the hardening change:

1. Deploy the Next.js code that writes `listens` through the trusted server client.
2. Run the active-pick preflight query above.
3. Apply `1781006414_harden_user_and_listen_rules.js` to PocketBase.
4. Verify draw, rating, group draw readiness, and account deactivation.

Do not apply the migration before deploying the matching app code, because older server actions still write `listens` with the member-scoped PocketBase client.
