# Phase 2 Handoff: Auth and Invite-Gated Membership

## What Was Built

- Implemented invite-gated signup with server-side validation against `VINYL-NIGHT`.
- Added PocketBase email/password login through Next.js server actions.
- Added logout/session clearing through a server action.
- Stored authenticated PocketBase session data in an HTTP-only `pb_auth` cookie.
- Added server-side authenticated route gating:
  - Unauthenticated users are redirected from the club routes to `/auth`.
  - Authenticated users are redirected from `/auth` to `/week`.
- Threaded the authenticated user's `display_name` and initials into the app shell.
- Replaced the static auth screen form with a working two-mode signup/login form that preserves the split-screen design handoff.
- Added a PocketBase migration that locks direct public `users` creation so the public PocketBase URL cannot bypass invite validation.
- Updated PocketBase setup docs for Phase 2 app auth.

## Key Files and Decisions

- `lib/auth.ts`
  - Server-only PocketBase helpers.
  - Loads `pb_auth` from cookies for server rendering.
  - Refreshes/validates authenticated users.
  - Maps PocketBase auth records into the small `ClubUser` shape used by the shell.
- `app/auth/actions.ts`
  - `signupAction` validates the invite code before authenticating as `_superusers` and creating a user.
  - `loginAction` authenticates normal users with `users.authWithPassword`.
  - `logoutAction` clears the app session and redirects to `/auth`.
- `components/auth-form.tsx`
  - Client component for the segmented signup/login UI.
  - Uses React/Next server actions rather than direct browser-side PocketBase auth.
- `app/auth/page.tsx`
  - Renders the design handoff auth page.
  - Redirects already-authenticated users to `/week`.
- `app/(club)/layout.tsx`
  - Forces dynamic rendering and redirects unauthenticated users to `/auth`.
- `components/app-shell.tsx`
  - Displays the authenticated member's `display_name` and avatar initials.
  - Adds the logout button.
- `pb_migrations/1781006404_lock_users_signup.js`
  - Sets `users.createRule = null`.
  - This keeps invite validation server-owned even though `NEXT_PUBLIC_PB_URL` is public.

PocketBase signup decision: direct public `users` creation is locked. The app server creates users with the configured superuser credentials only after invite validation. Admin-created accounts remain possible through the PocketBase dashboard.

## What Was Verified

- `npm run lint` passes.
- `npm run build` passes.

## Known Gaps or Risks

- Live signup/login against a real PocketBase instance was not exercised in this session because no running PocketBase credentials/session were provided.
- The new Phase 2 migration still needs to be applied to the owner's PocketBase instance.
- The header now displays the authenticated user's `display_name`, but other placeholder route content still uses static "You"/sample values until later phases replace those screens with real data.
- Session refresh is used to validate server-side route access; refreshed cookies are written during login/signup/logout actions, not from server component renders.

## Recommended Start for Phase 3

Start with the server-owned draw flow before replacing board/catalog/history placeholders:

1. Read `rs500-listening-club-prd.md`, especially sections 3, 4, 5, 6, 8.2, 12, and Phase 3.
2. Read `docs/phase-0-handoff.md`, `docs/phase-1-handoff.md`, and this handoff.
3. Read the Phase 3 design files:
   - `design_handoff_rsd500_codex/app/screens-week.jsx`
   - `design_handoff_rsd500_codex/app/components.jsx`
   - `design_handoff_rsd500_codex/app/sleeves.jsx`
   - `design_handoff_rsd500_codex/screens/02-week.png`
   - `design_handoff_rsd500_codex/app/theme.css`
4. Implement trusted server routes/actions for draw, skip rating, keep fresh pick, and rate fresh pick.
5. Do not implement board realtime, catalog, history, or stats yet unless required for Phase 3 coherence.

## Copy/Paste Prompt for Next Session

```text
We are working in /Users/jaydreyer/projects/RS500.

Phase 0, Phase 1, and Phase 2 are complete. Read:
- rs500-listening-club-prd.md
- docs/phase-0-handoff.md
- docs/phase-1-handoff.md
- docs/phase-2-handoff.md
- docs/pocketbase-setup.md

Then start Phase 3 from the PRD.

Important Phase 2 context:
- Auth is implemented with Next.js server actions and PocketBase users auth.
- Signup validates `VINYL-NIGHT` server-side before creating a PocketBase user.
- Direct public PocketBase users creation is locked by pb_migrations/1781006404_lock_users_signup.js.
- The app stores the PocketBase auth token/record in an HTTP-only pb_auth cookie.
- app/(club)/layout.tsx redirects unauthenticated users to /auth.
- app/auth/page.tsx redirects authenticated users to /week.
- components/app-shell.tsx receives the authenticated user and includes logout.
- Do not move draw/random-selection/business-rule enforcement to the browser.

Phase 3 goal:
- Add trusted server routes/actions for drawing, skip rating, keeping a fresh pick, and rating a fresh pick.
- Enforce logged-album exclusion server-side.
- Enforce one active fresh pick per user server-side.
- Create skip listens as immediately rated with rated_at.
- Create unheard fresh listens as listening with null rating and rated_at.
- Build the My Week draw machine against real PocketBase data.
- Include the already-heard branch, skip rating form, fresh confirmation, active-pick blocked state, and fresh rating flow.
- Preserve the design handoff's reveal/spin feel and honor prefers-reduced-motion.

Phase 2 verification completed:
- npm run lint passes.
- npm run build passes.

At the end of Phase 3, write a phase handoff document and include a copy/paste prompt for the next session.
```
