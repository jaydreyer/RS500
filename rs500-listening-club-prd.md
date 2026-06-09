# Spin 500 - Product Requirements Document

> A private weekly album-listening challenge for a small crew, built around Rolling Stone's 500 Greatest Albums list.
>
> Site URL: https://spin500.club
>
> Audience for this doc: a coding agent. Build to the acceptance criteria. Do not build anything in "Out of Scope."

## 1. Overview

Spin 500 is a private web app for a small, known group of friends working through Rolling Stone's 500 Greatest Albums. Each member independently draws a random album, listens, rates it, and optionally leaves a one-line take. A shared board shows what everyone drew, how they scored it, and lightweight crew reactions.

The point of the project is discovery through constraint: being handed an album you would not necessarily have chosen. Every product decision should protect that constraint.

### Design source of truth

Use `design_handoff_rsd500_codex/` as the visual and interaction design source of truth.

- Read `design_handoff_rsd500_codex/README.md` before implementing UI.
- Use `design_handoff_rsd500_codex/screens/` as the visual target for the production screens.
- Use `design_handoff_rsd500_codex/app/theme.css` for tokens, typography, color, grain, radius, responsive breakpoints, and motion cues.
- Use the prototype files in `design_handoff_rsd500_codex/app/` to understand behavior and layout, but do not ship or directly copy the prototype as production code.
- Production UI should recreate the handoff in Next.js, TypeScript, Tailwind CSS, and shadcn/ui while preserving the PRD's backend, auth, data, and rule-enforcement requirements.

### Goals

- Make the weekly draw feel like a small event, not a list lookup.
- Capture each member's pick, rating, and one-line take with minimal friction.
- Give the crew a shared board worth opening twice a week.
- Make it easy to listen immediately via Spotify and Apple Music links.

### Non-goals

- Public/discoverable product. This is invite-only for a known group.
- A full social network or threaded forum. Reactions and short comments only.
- Enforcing real-time calendars/cadence. Cadence is honor-system.

## 2. Users and Access

### Crew member

Authenticated user. Can draw albums, rate albums, comment/react, view the board, history, and stats.

Expected size: roughly 5-20 people.

### Admin

Project owner. Manages album catalog and member roster through the PocketBase superuser dashboard.

### Closed membership

The app is reachable at a public URL, but signup is gated so strangers cannot join.

Use a shared crew invite code by default:

- Invite code is stored in a server-only environment variable.
- Invite validation happens server-side, never only in the browser.
- Invalid invite codes reject signup.

Admin-created accounts are acceptable as a fallback, but invite-code signup is the MVP default.

## 3. Core Concept and Rules

### 3.1 Album list

Albums come from Rolling Stone's 500 Greatest Albums of All Time, current edition: the 2020 revamp as lightly updated in 2023.

The catalog is seeded from an external dataset supplied by the owner.

Do not hardcode, invent, or correct album titles, artists, rankings, release years, cover art, Spotify links, Apple Music links, or catalog numbers in application code. The seed dataset is the source of truth.

### 3.2 Per-user random draw

Each member draws their own album. Draws are independent: two members can land on the same album, and that is allowed.

A draw is selected uniformly at random from albums that the drawing user has not already logged. Both fresh picks and already-heard skips count as logged and are excluded from future draws for that user.

### 3.3 No dodging an unheard album

A member cannot re-roll simply because they dislike a draw. If the drawn album is one they have not heard, it becomes their active fresh pick.

### 3.4 Already-heard exception

If a member draws an album they have already listened to, they may rate/review it as an already-heard skip.

- Already-heard status is self-reported and unverifiable.
- Every skip still creates a public logged rating with `kind = skip`.
- Skip counts are visible in stats.
- A skip is immediately rated and does not become an active listening pick.

### 3.5 Cadence

Draws are timestamped and grouped into ISO weeks for display, for example `2026-W23`.

Do not build timezone windows, weekly reset jobs, or lockouts for MVP.

Fresh picks belong to the draw week, even if rated later.

### 3.6 One active fresh pick

A member cannot draw again while they have an unrated fresh pick with `kind = fresh` and `status = listening`.

This keeps the mechanic simple: listen before drawing again. Already-heard skip flow is available only during a draw sequence before an unheard album is kept.

### 3.7 Rating

Default scale is integer 1-10.

Expose the rating scale as a single config constant so it can later be swapped for another scale, such as 5 stars with halves.

Each rating may include an optional one-line take.

Skips are rated immediately. Fresh picks start as listening and are rated later.

## 4. Draw Flow

The draw flow must be enforced server-side.

```text
[idle] --draw request--> server selects random unlogged album
   |
   v
[presented: album X]
   |
   | "Have you already heard this?"
   |
   +-- YES --> [rate X now]
   |             kind = skip
   |             status = rated
   |             rated_at = now
   |             loop back to draw again if no active fresh pick exists
   |
   +-- NO  --> [keep as fresh pick]
                 kind = fresh
                 status = listening
                 rating = null
                 rated_at = null

[fresh pick] --after listening--> [rate X]
   status = rated
   rating = 1-10
   optional take
   rated_at = now
```

Guard: if the user has any unrated fresh pick, the server rejects new draw requests.

## 5. Tech Stack and Architecture

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Deployed on Vercel
- Mobile-first responsive design

### Backend

- PocketBase, self-hosted by the owner on a home Ubuntu server
- SQLite, auth, realtime, and admin UI through PocketBase
- Exposed via existing Cloudflare Tunnel
- PocketBase base URL configured as `NEXT_PUBLIC_PB_URL`

### Trusted server layer

Next.js server routes/actions are the trusted application layer for rule enforcement.

The browser must not directly decide or enforce:

- Invite-code validation
- Random draw selection
- Logged-album exclusion
- One-active-fresh-pick guard
- Skip/fresh listen creation
- Rating state transitions

Those operations must be performed server-side using the PocketBase SDK with the authenticated user's identity.

PocketBase API rules still protect collection access as defense in depth.

### Realtime

The frontend uses PocketBase realtime subscriptions for live board updates. Do not poll for board refreshes.

### Infrastructure

Owner is responsible for:

- Running PocketBase
- Cloudflare Tunnel
- systemd service
- CORS configuration
- Backups of `pb_data/`

Codex builds:

- Next.js app
- PocketBase schema migration files
- Seed importer script
- README/setup documentation

## 6. Data Model

### `users`

PocketBase built-in auth collection, extended with:

| field | type | notes |
|---|---|---|
| `display_name` | text | shown on the board |
| `avatar` | file | optional single avatar |

### `albums`

Seeded once from the owner-provided dataset.

| field | type | notes |
|---|---|---|
| `rank` | number | required, RS ranking 1-500 |
| `title` | text | required |
| `artist` | text | required |
| `year` | number | required release year |
| `cover_url` | url | required |
| `spotify_url` | url | optional |
| `apple_music_url` | url | optional |
| `external_ids` | json | optional |

### `listens`

One row per logged album, including active fresh picks and already-heard skips.

| field | type | notes |
|---|---|---|
| `user` | relation -> users | required |
| `album` | relation -> albums | required |
| `kind` | select | `fresh` or `skip` |
| `status` | select | `listening` or `rated` |
| `rating` | number | null while listening; 1-10 when rated |
| `take` | text | optional one-liner |
| `week` | text | ISO week key set at creation, e.g. `2026-W23` |
| `rated_at` | date | null while listening; set when rating is completed |
| `created` | autodate | PocketBase creation timestamp |

Uniqueness:

- Enforce one `(user, album)` row.
- This prevents the same user from logging the same album twice.

Rules:

- `skip` is always `rated`.
- `fresh` starts as `listening`.
- `fresh` becomes `rated` when the member submits a rating.

### `reactions`

Lightweight crew interaction on another member's listen.

| field | type | notes |
|---|---|---|
| `listen` | relation -> listens | required |
| `user` | relation -> users | reaction author |
| `emoji` | text | optional quick reaction |
| `comment` | text | optional short comment |
| `created` | autodate | PocketBase creation timestamp |
| `updated` | autodate | PocketBase update timestamp |

Uniqueness:

- Enforce one `(listen, user)` row.
- A member edits their existing reaction/comment instead of creating duplicates.

## 7. PocketBase API Rules

### `albums`

- List/View: `@request.auth.id != ""`
- Create/Update/Delete: empty rule, superuser only

### `listens`

- List/View: `@request.auth.id != ""`
- Create: server-owned flow only; if direct client create is allowed, require `@request.auth.id != "" && user = @request.auth.id`
- Update: `user = @request.auth.id`
- Delete: disabled for MVP, unless admin/superuser

### `reactions`

- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && user = @request.auth.id`
- Update/Delete: `user = @request.auth.id`

### `users`

- List/View: `@request.auth.id != ""`

## 8. Pages and Features

### 8.1 Auth

- Login
- Invite-gated signup
- Email/password auth is acceptable for MVP
- Email one-time code may be used if straightforward with PocketBase

### 8.2 My Week

The draw experience.

Must include:

- Current active fresh pick, if any
- Draw button when no active fresh pick exists
- Server-backed album reveal
- Brief spin/flip/reveal animation
- "Already heard?" branch
- Skip rating form
- Fresh pick confirmation
- Fresh rating form after listening

The reveal should feel like a small event, not an instant text swap.

### 8.3 The Board

Current week view showing everyone's fresh pick:

- Member
- Album cover
- Title
- Artist
- Status
- Rating, if rated
- One-line take, if present
- Spotify link, if present
- Apple Music link, if present
- Reactions/comments

The board updates live using PocketBase realtime.

### 8.4 History

Scorecard grid:

- Members by week
- Each cell shows album, cover, and score
- Include per-member detail view showing everything logged by that member, including fresh picks and skips

### 8.5 Stats

Derived stats:

- Harshest rater by average score
- Most generous rater by average score
- Most albums logged
- Skip count per member
- Highest-rated albums across the crew
- Lowest-rated albums across the crew
- Albums logged by two or more members, with score comparison

Use a minimum sample threshold of 3 rated fresh listens before ranking harshest/most generous rater.

## 9. Album Art and Listen Links

Cover art is required. A text-only board is not acceptable for MVP.

The seed dataset must include `cover_url` for every album. The importer rejects rows without cover art.

Spotify and Apple Music links are optional, but strongly encouraged.

When present:

- Show "Play on Spotify"
- Show "Play on Apple Music"

If only one service link exists, show that one. If neither exists, hide listen-link actions for that album.

## 10. Album Catalog Seeding

Provide a seed importer script that loads the RS500 dataset into the `albums` collection.

The owner supplies a CSV or JSON dataset with:

- `rank`
- `title`
- `artist`
- `year`
- `cover_url`
- `spotify_url` optional
- `apple_music_url` optional
- `external_ids` optional

Importer requirements:

- Idempotent and safe to re-run
- Dedupe by `rank`
- Also detect possible duplicate `(title, artist)` rows and report them
- Validate required fields
- Reject rows missing `cover_url`
- Do not generate, guess, or correct metadata
- Report a clear summary: created, updated, skipped, failed

## 11. Out of Scope for MVP

- Push, email, Telegram, or SMS notifications
- Pre-seeded "albums I have already heard" library
- Toggle between RS list editions
- Threaded discussion or full forum
- Shareable recap images
- Streaks, badges, achievements
- Public profiles
- Any re-roll mechanism other than the already-heard exception
- Complex timezone enforcement or weekly lockouts

## 12. Config Decisions

Defaults:

- Rating scale: integer 1-10
- Signup gating: shared invite code
- RS edition: current 2020/2023 list
- Stats sample threshold: 3 rated fresh listens
- Reaction policy: one editable reaction/comment per user per listen

Environment variables:

- `NEXT_PUBLIC_PB_URL`
- `PB_ADMIN_EMAIL` for seed/admin scripts
- `PB_ADMIN_PASSWORD` for seed/admin scripts
- `CREW_INVITE_CODE`

## 13. Implementation Phases

Build in phases so each coding pass can keep a small context window. At the start of any phase, read this PRD, the phase definition below, and only the relevant design handoff files listed for that phase.

Each phase should end with:

- Code committed or clearly ready for review.
- A short note of what changed, what was verified, and what remains.
- No work from later phases unless it is required to make the current phase coherent.

### Phase 0 - Project Scaffold and Design Tokens

Purpose: create the production app shell and map the design handoff into the real stack.

Design files to read:

- `design_handoff_rsd500_codex/README.md`
- `design_handoff_rsd500_codex/app/theme.css`
- `design_handoff_rsd500_codex/app/app.jsx`
- `design_handoff_rsd500_codex/screens/01-auth.png`
- `design_handoff_rsd500_codex/screens/02-week.png`

Build:

- Scaffold Next.js App Router with TypeScript.
- Add Tailwind CSS and shadcn/ui.
- Add the production app shell, route structure, responsive top/bottom navigation, global typography, CSS variables, film grain, motion keyframes, and default Midnight theme.
- Add shared UI primitives that match the handoff: buttons, avatar, score badge, rating input, reaction row, eyebrow/mono labels, album cover component with fallback.
- Add config constants for rating scale and stats sample threshold.

Done when:

- The app runs locally.
- Global styling matches the Midnight design direction.
- Empty route shells exist for Auth, My Week, Board, Catalog, History, Stats, and Album Detail.
- No PocketBase integration or business logic is required yet.

### Phase 1 - PocketBase Schema, Rules, and Seed Importer

Purpose: establish the backend contract before building rule-dependent UI.

Design files to read:

- None required beyond the PRD unless rendering importer/admin docs.

Build:

- Add PocketBase migration files for `users` extensions, `albums`, `listens`, and `reactions`.
- Add API rules described in this PRD.
- Add uniqueness constraints or equivalent migration logic for `(user, album)` listens and `(listen, user)` reactions.
- Add a seed importer script for CSV and/or JSON owner datasets.
- Validate required album fields and reject rows missing `cover_url`.
- Make importer idempotent by `rank`, update existing rows, detect possible duplicate `(title, artist)` rows, and print created/updated/skipped/failed counts.
- Add setup documentation for PocketBase environment variables and importer usage.

Done when:

- A fresh PocketBase instance can apply migrations.
- Re-running the importer does not create duplicate albums.
- Bad seed rows fail with clear errors.

### Phase 2 - Auth and Invite-Gated Membership

Purpose: let only invited crew members enter the app.

Design files to read:

- `design_handoff_rsd500_codex/app/screens-auth.jsx`
- `design_handoff_rsd500_codex/screens/01-auth.png`
- `design_handoff_rsd500_codex/app/theme.css`

Build:

- Implement login.
- Implement signup with server-side invite-code validation against `CREW_INVITE_CODE`.
- Store/display `display_name`.
- Add authenticated app layout and logout/session handling.
- Ensure unauthenticated users only see the auth screen.

Done when:

- Valid invite code signup works.
- Invalid invite code signup fails server-side.
- Login/logout works.
- Auth UI matches the handoff's split-screen invite-only design.

### Phase 3 - Server-Owned Draw and Rating Flow

Purpose: implement the core product rule: each user draws from their own unlogged pool and cannot dodge unheard albums.

Design files to read:

- `design_handoff_rsd500_codex/app/screens-week.jsx`
- `design_handoff_rsd500_codex/app/components.jsx`
- `design_handoff_rsd500_codex/app/sleeves.jsx`
- `design_handoff_rsd500_codex/screens/02-week.png`
- `design_handoff_rsd500_codex/app/theme.css`

Build:

- Add trusted server routes/actions for drawing, skip rating, keeping a fresh pick, and rating a fresh pick.
- Enforce server-side logged-album exclusion.
- Enforce one active fresh pick per user.
- Create `skip` listens as immediately `rated` with `rated_at`.
- Create unheard `fresh` listens as `listening` with null `rating` and null `rated_at`.
- Update fresh ratings to `rated`, set `rating`, optional `take`, and `rated_at`.
- Build the My Week screen, draw machine, already-heard branch, skip rating form, fresh confirmation, active-pick blocked state, and "I've finished - rate it" flow.
- Include a brief spin/flip/reveal animation and honor `prefers-reduced-motion`.

Done when:

- All draw and rating acceptance criteria pass.
- The browser never decides random selection or state transitions.
- The My Week experience feels like the design handoff, including the reveal moment.

### Phase 4 - Live Board and Reactions

Purpose: make the shared weekly crew board useful and alive.

Design files to read:

- `design_handoff_rsd500_codex/app/screens-board.jsx`
- `design_handoff_rsd500_codex/app/components.jsx`
- `design_handoff_rsd500_codex/screens/03-board.png`
- `design_handoff_rsd500_codex/app/theme.css`

Build:

- Build current-week Board view with member, cover, title, artist, status, rating, take, Spotify/Apple Music actions, and reactions/comments.
- Subscribe to PocketBase realtime updates for listens and reactions.
- Implement one editable reaction/comment row per user per listen.
- Add the live-event/ticker treatment from the handoff.
- Add an empty-current-user slot with "Draw your pick" CTA when applicable.

Done when:

- Another member's draw, rating, or reaction appears without manual refresh.
- Members can only create/edit their own reaction row.
- Album covers and service links render according to album data.

### Phase 5 - Catalog and Album Detail

Purpose: make the full RS500 list browsable without undermining the draw mechanic.

Design files to read:

- `design_handoff_rsd500_codex/app/screens-catalog.jsx`
- `design_handoff_rsd500_codex/app/screens-detail.jsx`
- `design_handoff_rsd500_codex/screens/04-catalog.png`
- `design_handoff_rsd500_codex/screens/07-album-detail.png`
- `design_handoff_rsd500_codex/app/theme.css`

Build:

- Build read-only The 500 catalog browser.
- Add search across title and artist.
- Add filters for All, Logged, Unlogged, and Heard.
- Add sortable columns for rank, album/title, artist, year, and user score.
- Add responsive mobile table behavior.
- Build album detail with large cover, service links, rank/year, crew average/count, who drew it, and crew thread.

Done when:

- Catalog browsing works from real PocketBase data.
- Album detail is reachable from catalog, board, and history surfaces.
- Catalog does not create any re-roll or manual logging loophole.

### Phase 6 - History and Stats

Purpose: give the crew a long-term record and lightweight comparisons.

Design files to read:

- `design_handoff_rsd500_codex/app/screens-history.jsx`
- `design_handoff_rsd500_codex/app/screens-stats.jsx`
- `design_handoff_rsd500_codex/screens/05-history.png`
- `design_handoff_rsd500_codex/screens/06-stats.png`
- `design_handoff_rsd500_codex/app/theme.css`

Build:

- Build History scorecard grid with members by week.
- Include album cover, album, and score/listening state per cell.
- Add per-member detail view showing all logged fresh picks and skips.
- Build Stats cards for harshest rater, most generous rater, most albums logged, skip count per member, highest-rated albums, lowest-rated albums, and albums logged by two or more members with score comparison.
- Apply minimum sample threshold of 3 rated fresh listens for harshest/most generous rankings.

Done when:

- History and Stats match the PRD data requirements and visual handoff.
- Skips are visible in member detail and skip-count stats.

### Phase 7 - Documentation, Verification, and MVP Polish

Purpose: make the app deployable, testable, and maintainable.

Design files to read:

- All screenshots in `design_handoff_rsd500_codex/screens/` for final visual comparison.
- `design_handoff_rsd500_codex/README.md`

Build:

- Add README setup instructions for Next.js, PocketBase, environment variables, migrations, seeding, and deployment.
- Add an MVP verification checklist mapped to the acceptance criteria.
- Add focused automated tests for server-owned draw/rating rules, invite-code signup, seed importer validation/idempotency, and stats thresholds where practical.
- Run visual checks across desktop and mobile breakpoints.
- Confirm no out-of-scope features were added.

Done when:

- Acceptance criteria have been verified or clearly marked with remaining blockers.
- The app can be deployed to Vercel against the owner's PocketBase URL.
- The implementation visually tracks the design handoff across all primary screens.

## 14. Acceptance Criteria

- A user with a valid invite code can sign up.
- A user without a valid invite code cannot sign up.
- Invite-code validation happens server-side.
- Drawing logic happens server-side.
- Drawing excludes every album the user has already logged.
- The same user cannot log the same album twice.
- A user with an unrated fresh pick cannot draw again.
- Drawing an already-heard album records a `skip` listen with `status = rated`, rating, optional take, and `rated_at`.
- Drawing an unheard album creates a `fresh` listen with `status = listening`, null rating, and null `rated_at`.
- Rating a fresh pick updates it to `status = rated`, sets rating, optional take, and `rated_at`.
- A user can only create/edit their own listens and reactions.
- All authenticated members can read everyone's board activity.
- A user can have only one reaction row per listen.
- The Board reflects another member's draw, rating, or reaction without manual refresh.
- The History grid shows members by weeks with album cover, album, and score per cell.
- Album covers render on Board, History, and detail views.
- Spotify links render when `spotify_url` is present.
- Apple Music links render when `apple_music_url` is present.
- Re-running the seed script does not create duplicate albums.
- The seed script rejects albums missing required fields, including `cover_url`.
