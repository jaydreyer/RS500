# PocketBase Setup

Phase 1 defines the PocketBase backend contract for Spin 500. Phase 2 adds server-owned app auth and invite-gated membership. Draw routes and client-side business logic are still intentionally out of scope.

## Environment Variables

Create a local `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_PB_URL`: PocketBase base URL, for example `http://127.0.0.1:8090` locally or the Cloudflare Tunnel URL in production.
- `PB_ADMIN_EMAIL`: PocketBase superuser email for seed/admin scripts and trusted server-side invite signup.
- `PB_ADMIN_PASSWORD`: PocketBase superuser password for seed/admin scripts and trusted server-side invite signup.
- `CREW_INVITE_CODE`: Shared signup code used by the Next.js server action before account creation.
- `SERVER_ACTION_ALLOWED_ORIGINS`: Comma-separated trusted hosts for Next.js Server Actions.

Rotate `CREW_INVITE_CODE` before production use.

Do not expose `PB_ADMIN_EMAIL` or `PB_ADMIN_PASSWORD` to browser code.

## Migrations

PocketBase reads JavaScript migrations from `pb_migrations/`.

Added Phase 1 migrations:

- `1781006400_update_users_profile_fields.js`: extends `users` with `display_name` and optional `avatar`; authenticated members can list/view users.
- `1781006401_create_albums_collection.js`: creates read-only-to-members `albums` with a unique `rank` index.
- `1781006402_create_listens_collection.js`: creates `listens` with authenticated read access, owner create/update rules, locked deletes, and a unique `(user, album)` index.
- `1781006403_create_reactions_collection.js`: creates `reactions` with authenticated read access, owner create/update/delete rules, and a unique `(listen, user)` index.
- `1781006408_allow_zero_ratings.js`: lowers the `listens.rating` minimum to `0` so decimal ratings like `0.9` and `0.0` are valid.

Added Phase 2 migration:

- `1781006404_lock_users_signup.js`: locks direct public `users` creation so signup can only happen through the Next.js trusted server action after invite-code validation. PocketBase superusers can still create users from the dashboard.

Run migrations from the PocketBase directory that contains or can see this app's `pb_migrations` folder. A local development example:

```bash
pocketbase serve --dir ./pb_data --migrationsDir /Users/jaydreyer/projects/RS500/pb_migrations
```

For the owner's Ubuntu service, point the PocketBase binary or service working directory at a directory containing these migrations, or copy/sync `pb_migrations/` beside the PocketBase executable according to the owner's deployment layout.

PocketBase API rule note: `null` rules are locked to superusers. Empty-string rules are public. Album create/update/delete, listen deletes, and direct user creates are intentionally locked with `null`.

## App Auth

Phase 2 uses email/password auth against the PocketBase `users` collection:

- Signup posts to a Next.js server action.
- The server action validates `CREW_INVITE_CODE` before touching PocketBase.
- The server action authenticates as `_superusers`, creates the `users` record with `display_name`, then logs the new user in.
- Login posts to a Next.js server action and calls `users.authWithPassword`.
- The authenticated PocketBase token/record are stored in an HTTP-only `pb_auth` cookie.
- The authenticated route group redirects unauthenticated requests to `/auth`.
- `/auth` redirects authenticated members to `/week`.

Because `NEXT_PUBLIC_PB_URL` is intentionally visible to the browser, keeping `users.createRule = null` is important. Without that rule, a stranger could bypass the app form and call PocketBase signup directly.

## Album Seed Dataset

The owner supplies CSV or JSON data. The importer accepts either:

- A CSV file with headers.
- A JSON array.
- A JSON object with an `albums` array.

Required fields:

- `rank`
- `title`
- `artist`
- `year`
- `cover_url`

Optional fields:

- `spotify_url`
- `apple_music_url`
- `review_links`
- `external_ids`

Header names are normalized for case, spaces, and hyphens, so `Cover URL`, `cover-url`, and `cover_url` all map to `cover_url`.

The importer rejects rows that are missing required fields, including `cover_url`. URL fields must be `http` or `https` URLs when present. `external_ids` may be a JSON object in JSON input or a valid JSON string in CSV input. `review_links` is a JSON array of `{ "source", "url", "kind" }` objects, where `kind` defaults to `review`.

Review/reference links can be enriched from MusicBrainz release-group URL relationships when `external_ids.musicbrainz_release_group` is present:

```bash
npm run enrich:reviews -- --dry-run --limit 20
npm run enrich:reviews
```

The enrichment script uses a meaningful `User-Agent` and waits at least one second between MusicBrainz requests.

## Import Usage

Dry-run first:

```bash
npm run import:albums -- --file ./data/rs500.csv --validate-only
npm run import:albums -- --file ./data/rs500.csv --dry-run
```

Import for real:

```bash
npm run import:albums -- --file ./data/rs500.csv
```

JSON works the same way:

```bash
npm run import:albums -- ./data/rs500.json
```

The importer:

- Authenticates as the PocketBase superuser from `.env.local` or shell environment.
- Supports `--validate-only` for local file validation without contacting PocketBase.
- Upserts albums by `rank`.
- Creates missing ranks.
- Updates existing ranks when the supplied data changes.
- Skips existing ranks when the supplied data is identical.
- Fails duplicate ranks in the same input file.
- Prints possible duplicate `(title, artist)` rows for owner review.
- Prints created, updated, skipped, and failed counts.

The script exits with a non-zero status if any row fails validation or PocketBase persistence.

## Example CSV

```csv
rank,title,artist,year,cover_url,spotify_url,apple_music_url,review_links,external_ids
1,Example Album,Example Artist,1971,https://example.com/cover.jpg,https://open.spotify.com/album/example,https://music.apple.com/us/album/example,"[{""source"":""AllMusic"",""url"":""https://www.allmusic.com/album/example"",""kind"":""reference""}]","{""discogs"":""123""}"
```
