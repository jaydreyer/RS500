# Security and Test Hardening Review

Date: 2026-06-09

## Executive Summary

The app is still not "complete and total test validated" because authenticated, seeded, multi-user PocketBase QA remains. The main app-level hardening items from the initial review have now been addressed: browser security headers, Server Action origin configuration, server-only invite configuration, auth attempt throttling, dependency pinning, and safer external link rel attributes.

The remaining app-visible risk is the upstream Next/PostCSS audit advisory. Do not use npm's suggested force fix because it proposes a breaking downgrade; track the Next.js release that updates its nested PostCSS dependency.

## Validated In This Review

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 17 tests.
- `npm run build`: passed with Next.js 16.2.7.
- `npm audit` and `npm audit --omit=dev`: both report the same moderate advisory in Next's nested PostCSS dependency.
- `.env.local` exists locally but is not tracked; `.env.example`, `.gitignore`, `next.config.ts`, and `package-lock.json` are tracked.

## Fixed In This Pass

- Added global CSP and security headers in `next.config.ts`.
- Added env-driven `experimental.serverActions.allowedOrigins` configuration.
- Moved the shared invite code to server-only `CREW_INVITE_CODE`.
- Added hashed in-memory signup/login attempt throttling in `app/auth/actions.ts` and `lib/rate-limit*.ts`.
- Replaced `latest` dependency ranges with pinned versions.
- Added explicit `noopener noreferrer` to external links.
- Added unit coverage for the rate limiter.

## Remaining Findings

### H-001: Production Dependency Audit Is Not Clean

Severity: Medium

Location: `package-lock.json:5048-5103`

Evidence: Next.js is locked at `16.2.7`; its nested `postcss` dependency is locked at `8.4.31`. `npm audit` reports GHSA-qx2v-qp2m-jg93 against `postcss <8.5.10`.

Impact: Audit gates will fail, and the affected package has an XSS advisory in CSS stringify output. The direct top-level PostCSS is patched, but Next currently pulls the vulnerable nested version.

Fix: Track the Next.js release that updates the nested PostCSS dependency, then upgrade. Do not run `npm audit fix --force` blindly; npm currently suggests an unsafe downgrade path.

### M-001: Authenticated End-to-End Test Coverage Is Still Missing

Severity: Medium

Location: `docs/mvp-verification-checklist.md:42-50`

Evidence: The checklist still marks owner-instance QA as remaining: migrations, real dataset import, two member accounts, signup, draw/rating flows, realtime board, catalog/history/stats/detail.

Impact: The unit tests cover core rules, but they do not prove the deployed app works securely across real auth cookies, PocketBase rules, realtime subscriptions, seeded data, browser navigation, or two-user interaction.

Fix: Add a seeded PocketBase test environment and Playwright smoke tests for signup/login, draw/rate, ownership denial, and two-session board realtime.

## Positive Security Notes

- Request-bound auth helpers are marked server-only in `lib/auth.ts:1`; proxy-safe session and cookie helpers live separately in `lib/auth-session.ts`.
- Auth cookies are set HttpOnly, SameSite lax, path `/`, and use request-aware Secure handling for HTTPS while allowing local HTTP testing in `lib/auth-session.ts` and `lib/auth-cookie.ts`.
- Signup validation happens server-side before account creation in `app/auth/actions.ts`.
- Google signup validates the invite code in the app route before creating a PocketBase user, keeping public PocketBase user creation locked.
- Signup/login attempts are rate-limited before PocketBase auth calls in `app/auth/actions.ts`.
- PocketBase user self-signup is disabled in `pb_migrations/1781006404_lock_users_signup.js:1-6`.
- PocketBase rules restrict listen/reaction writes to the authenticated owner in `pb_migrations/1781006402_create_listens_collection.js:10-14` and `pb_migrations/1781006403_create_reactions_collection.js:10-14`.
- Unique indexes prevent duplicate user-album listens and duplicate user-listen reactions in `pb_migrations/1781006402_create_listens_collection.js:68-73` and `pb_migrations/1781006403_create_reactions_collection.js:43-46`.
- No `dangerouslySetInnerHTML`, `eval`, `new Function`, direct `innerHTML`, `sessionStorage`, or client-side `document.cookie` usage was found in the app source during this review.
- Review editors intentionally use `localStorage` for rating and review-text drafts so an expired session cannot destroy a long review. Drafts contain no auth token, are scoped to a listen or album, expire after 45 days, and are cleared after save or cancel.

## Recommended Next Steps

1. Set production `CREW_INVITE_CODE` to a new rotated value.
2. Set production `SERVER_ACTION_ALLOWED_ORIGINS` to the deployed app host.
3. Monitor/upgrade Next when the nested PostCSS advisory is patched.
4. Add authenticated Playwright tests against a seeded PocketBase instance.
5. Add edge/WAF rate limits as a production defense beyond the in-process limiter.
