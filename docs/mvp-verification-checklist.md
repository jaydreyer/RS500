# MVP Verification Checklist

Status legend:

- Verified: covered by code review, automated tests, or local unauthenticated route checks.
- Blocked: requires the owner's seeded PocketBase instance and authenticated browser sessions.

## Acceptance Criteria

| Criteria | Status | Evidence |
| --- | --- | --- |
| A user with a valid invite code can sign up. | Blocked | Server action exists; live PocketBase signup still needs owner instance QA. |
| A user without a valid invite code cannot sign up. | Verified | `npm test` covers invite rejection in `lib/auth-rules.ts`. |
| Invite-code validation happens server-side. | Verified | `app/auth/actions.ts` validates before PocketBase user creation. |
| Drawing logic happens server-side. | Verified | `lib/draw.ts` and `app/(club)/week/actions.ts` own draw/rating mutations. |
| Drawing excludes every album the user has already logged. | Verified | `npm test` covers drawable-pool exclusion; `lib/draw.ts` applies it before random selection. |
| The same user cannot log the same album twice. | Verified | PocketBase migration adds unique `listens(user, album)` index. |
| A user with an unrated fresh pick cannot draw again. | Verified | `lib/draw.ts` checks active fresh pick; `npm test` covers active-fresh guard. |
| Drawing an already-heard album records a `skip` listen with `status = rated`, rating, optional take, and `rated_at`. | Blocked | Server mutation exists; needs live flow QA. |
| Drawing an unheard album creates a `fresh` listen with `status = listening`, null rating, and null `rated_at`. | Blocked | Server mutation exists; needs live flow QA. |
| Rating a fresh pick updates it to `status = rated`, sets rating, optional take, and `rated_at`. | Blocked | Server mutation exists; needs live flow QA. |
| A user can only create/edit their own listens and reactions. | Verified | PocketBase rules and server actions enforce ownership. |
| All authenticated members can read everyone's board activity. | Blocked | API rules and board loader are present; needs authenticated owner-instance QA. |
| A user can have only one reaction row per listen. | Verified | PocketBase migration adds unique `reactions(listen, user)` index. |
| The Board reflects another member's draw, rating, or reaction without manual refresh. | Blocked | Realtime subscription exists; needs two-user browser QA. |
| The History grid shows members by weeks with album cover, album, and score per cell. | Blocked | UI/data mapper exists; needs seeded authenticated QA. |
| Album covers render on Board, History, and detail views. | Blocked | Components use seeded `cover_url`; needs seeded authenticated visual QA. |
| Spotify links render when `spotify_url` is present. | Blocked | Board/detail/catalog code paths exist; needs seeded URL QA. |
| Apple Music links render when `apple_music_url` is present. | Blocked | Board/detail/catalog code paths exist; needs seeded URL QA. |
| Re-running the seed script does not create duplicate albums. | Verified | Unique album rank index plus `npm test` importer idempotency coverage. |
| The seed script rejects albums missing required fields, including `cover_url`. | Verified | `npm test` covers missing `cover_url`; importer exits non-zero on failed rows. |

## Final Local Checks

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 11 tests.
- `npm run build`: passed.
- HTTP route checks: `/auth` returns 200; `/week`, `/board`, `/catalog`, `/history`, `/stats`, and `/albums/example` redirect unauthenticated users to `/auth`.
- Desktop and mobile visual browser pass: blocked in this session because the in-app browser refused local navigation with `ERR_BLOCKED_BY_CLIENT`.

## Remaining Owner-Instance QA

- Apply migrations to the owner's PocketBase instance.
- Import the real RS500 dataset.
- Create at least two member accounts.
- Verify valid and invalid signup in-browser.
- Verify draw, already-heard skip rating, keep-fresh, fresh rating, and active-pick blocking.
- Verify Board realtime across two authenticated sessions.
- Verify Catalog, History, Stats, and Album Detail with seeded cover and service URL data.
