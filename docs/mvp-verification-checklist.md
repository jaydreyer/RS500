# MVP Verification Checklist

Status legend:

- Verified: covered by code review, automated tests, or local unauthenticated route checks.
- Blocked: requires the owner's seeded PocketBase instance and authenticated browser sessions.

## Acceptance Criteria

| Criteria | Status | Evidence |
| --- | --- | --- |
| A user with a valid invite code can sign up. | Verified | Production QA: Test One and Test Two signed up through `https://spin500.club` with invite code `VINYL-NIGHT`. |
| A user without a valid invite code cannot sign up. | Verified | `npm test` covers invite rejection in `lib/auth-rules.ts`. |
| Invite-code validation happens server-side. | Verified | `app/auth/actions.ts` validates before PocketBase user creation. |
| Drawing logic happens server-side. | Verified | `lib/draw.ts` and `app/(club)/week/actions.ts` own draw/rating mutations. |
| Drawing excludes every album the user has already logged. | Verified | `npm test` covers drawable-pool exclusion; `lib/draw.ts` applies it before random selection. |
| The same user cannot log the same album twice. | Verified | PocketBase migration adds unique `listens(user, album)` index. |
| A user with an unrated fresh pick cannot draw again. | Verified | `lib/draw.ts` checks active fresh pick; `npm test` covers active-fresh guard. |
| Drawing an already-heard album records a `skip` listen with `status = rated`, rating, optional take, and `rated_at`. | Verified | Production QA: Test One logged PJ Harvey, `Rid of Me` as an already-heard skip with rating/take/rated timestamp. |
| Drawing an unheard album creates a `fresh` listen with `status = listening`, null rating, and null `rated_at`. | Verified | Production QA: Test Two drew Aretha Franklin, `I Never Loved a Man the Way I Love You` as a fresh listening pick. |
| Rating a fresh pick updates it to `status = rated`, sets rating, optional take, and `rated_at`. | Verified | Production QA: Test One rated Shania Twain, `Come On Over` as a fresh pick with rating/take/rated timestamp. |
| A user can only create/edit their own listens and reactions. | Verified | PocketBase rules and server actions enforce ownership. |
| All authenticated members can read everyone's board activity. | Verified | Production QA: Test One and Test Two both used The Board and saw cross-member activity. |
| A user can have only one reaction row per listen. | Verified | PocketBase migration adds unique `reactions(listen, user)` index. |
| The Board reflects another member's draw, rating, or reaction without manual refresh. | Verified | Production QA: two-user Board check completed with Test Two's fresh draw and Test One's reaction. |
| The History grid shows members by weeks with album cover, album, and score per cell. | Blocked | UI/data mapper exists; needs seeded authenticated QA. |
| Album covers render on Board, History, and detail views. | Blocked | Components use seeded `cover_url`; needs seeded authenticated visual QA. |
| Spotify links render when `spotify_url` is present. | Blocked | Board/detail/catalog code paths exist; needs seeded URL QA. |
| Apple Music links render when `apple_music_url` is present. | Blocked | Board/detail/catalog code paths exist; needs seeded URL QA. |
| Re-running the seed script does not create duplicate albums. | Verified | Unique album rank index plus `npm test` importer idempotency coverage. |
| The seed script rejects albums missing required fields, including `cover_url`. | Verified | `npm test` covers missing `cover_url`; importer exits non-zero on failed rows. |

## Final Local Checks

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 17 tests.
- `npm run build`: passed.
- HTTP route checks: `/auth` returns 200; `/week`, `/board`, `/catalog`, `/history`, `/stats`, and `/albums/example` redirect unauthenticated users to `/auth`.
- Desktop and mobile visual browser pass: blocked in this session because the in-app browser refused local navigation with `ERR_BLOCKED_BY_CLIENT`.

## Remaining Owner-Instance QA

- Verify invalid signup in-browser.
- Verify active-pick blocking remains visible after a fresh pick is kept but before rating.
- Verify Catalog, History, Stats, and Album Detail with seeded cover and service URL data.
- Test users/listens/reactions were cleaned from PocketBase after production QA; the album catalog remains seeded.
