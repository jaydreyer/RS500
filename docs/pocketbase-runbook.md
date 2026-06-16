# PocketBase Runbook

Quick reference for future maintenance work in this repo.

## Current Project Setup

- Maintenance scripts read `NEXT_PUBLIC_PB_URL`, `PB_ADMIN_EMAIL`, and `PB_ADMIN_PASSWORD` from the shell, then `.env.local`/`.env` in the current checkout, then `.env.local`/`.env` in the primary Git checkout. This lets Codex worktrees reuse `/Users/jaydreyer/projects/RS500/.env.local` without copying secrets.
- In the current owner/dev workspace, `.env.local` points at `http://ai-lab:8091`.
- The Codex desktop workspace may not have a `pocketbase` binary on `PATH`. Check first with:

```bash
command -v pocketbase || true
```

- The backend can be health-checked with:

```bash
curl -fsS "$NEXT_PUBLIC_PB_URL/api/health"
```

Never print or commit superuser credentials.

## Normal Migration Path

PocketBase applies JavaScript migrations when the PocketBase server runs with this repo's migration directory:

```bash
pocketbase serve --dir ./pb_data --migrationsDir /Users/jaydreyer/projects/RS500/pb_migrations
```

For the owner's service, the equivalent is to point the running PocketBase service at a directory that contains or can see `/Users/jaydreyer/projects/RS500/pb_migrations`, or to copy/sync the migrations into the service's expected migrations directory.

Prefer this path whenever the PocketBase binary/service is available.

## When The CLI Is Not Available

If `pocketbase` is not installed locally but the configured backend is reachable and superuser env vars are present, simple additive collection changes can be applied through the PocketBase Collections API with the JS SDK.

Use this only when appropriate for the change:

- Good fit: creating a new collection, adding an additive field, adjusting indexes/rules to match a migration that has already been reviewed.
- Poor fit: destructive changes, data migrations, complicated transforms, or anything that needs transactional migration semantics.

When applying a schema change this way:

1. Keep the matching file in `pb_migrations/`.
2. Make that migration idempotent so a later official migration run does not fail if the API-applied schema already exists.
3. Authenticate as `_superusers` using env vars, never hard-coded credentials.
4. Read the collection back and verify fields, rules, and indexes.
5. Record what happened in the final handoff.

Minimal inspection pattern:

```bash
node --input-type=module <<'NODE'
import fs from "node:fs";
import PocketBase from "pocketbase";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
    }),
);

const pb = new PocketBase(env.NEXT_PUBLIC_PB_URL);
pb.autoCancellation(false);
await pb.collection("_superusers").authWithPassword(
  env.PB_ADMIN_EMAIL,
  env.PB_ADMIN_PASSWORD,
  { requestKey: null },
);

const collection = await pb.collections.getOne("feed_mentions", { requestKey: null });
console.log(JSON.stringify({
  name: collection.name,
  id: collection.id,
  fields: collection.fields.map((field) => ({
    name: field.name,
    type: field.type,
    required: field.required,
    collectionId: field.collectionId,
  })),
  indexes: collection.indexes,
}, null, 2));
NODE
```

## Session Note: Feed Mentions

On June 15, 2026, `feed_mentions` was created on the live `ai-lab:8091` backend through the superuser Collections API because no local `pocketbase` binary was available in the Codex desktop environment. The matching migration is `pb_migrations/1781006417_create_feed_mentions.js` and is idempotent.

Verified live collection details after creation:

- Collection: `feed_mentions`
- Relations: `post -> feed_posts`, optional `reply -> feed_replies`, `actor -> users`, `user -> users`
- Read marker: optional `read_at` date
- Rules: authenticated actor/recipient can list/view; authenticated actor can create mentions for other users; recipient can update read state; delete locked
- Indexes: `user, created`, `user, read_at`, `post`, `reply`
