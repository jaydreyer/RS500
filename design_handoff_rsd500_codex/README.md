# Design Handoff: RSD 500 Randomizer

A weekly album-listening club built on *Rolling Stone*'s 500 Greatest Albums. This package is the **visual + interaction design reference** — everything you need to recreate the UI faithfully. It deliberately contains **no PRD / data-model / backend material**; it is the design source of truth only.

---

## ⚠️ Read this first — what these files are

The files in this bundle are a **design prototype written in plain HTML + React (via in-browser Babel)**. They exist to show the intended **look, motion, type, color, and interaction flows**. They are **not** production code and should **not** be shipped or copy-pasted directly.

**Your job:** recreate these screens pixel-faithfully inside the target codebase using its existing framework, component library, and conventions. If no environment exists yet, pick an appropriate stack and map the design tokens below into it. Use the prototype for *fidelity of UI and behavior*; the actual data, persistence, auth, and realtime wiring are out of scope for this packet.

**Fidelity: High.** Final colors, type, spacing, layout, and interactions are intended exactly as shown.

### Placeholder content (visual scaffolding only — not design intent)
- **Album metadata** in `app/data.js` is illustrative sample data so the board looks populated. Real titles/artists/ranks/art come from the production dataset.
- **Album covers** are **procedurally generated SVG sleeves** (`app/sleeves.jsx`) purely to avoid broken images. In production, render real cover art; a generated fallback for missing art is fine.
- The "live" board, reactions, and auth are **faked in React state** for demo purposes. Treat their *visual states* as the spec, not their plumbing.

---

## Theme — default is now MIDNIGHT (dark)

The product ships **dark by default.** The palette is a **clean, cool near-black** ground with off-white ink and a single vermillion accent — it reads like a record sleeve at night. Two alternate themes exist in the stylesheet (`[data-theme]`); Midnight is the one to build against unless told otherwise.

Themes are defined as CSS variables in `app/theme.css`. Map these to your framework's token system (CSS vars / Tailwind config / theme object).

### Midnight — DEFAULT (`:root`)
| Token | Value | Role |
|---|---|---|
| `--paper` | `#0C0C0E` | app background (cool near-black) |
| `--paper-2` | `#131316` | lifted surface (e.g. hero panel) |
| `--card` | `#18181C` | cards, inputs |
| `--ink` | `#F4F2EC` | primary text |
| `--ink-soft` | `#A7A398` | secondary text |
| `--ink-faint` | `#6D6A61` | tertiary / mono labels |
| `--line` | `#f4f2ec12` | hairline borders |
| `--line-strong` | `#f4f2ec2b` | stronger borders |
| `--accent` | `#E2452B` | vermillion — buttons, highlights, the "500" |
| `--accent-ink` | `#FFF6EE` | text on accent |
| `--accent-2` | `#3AA99B` | teal secondary |
| `--good` | `#56C18B` | positive/success |
| `--shadow` | `0 1px 0 #00000060, 0 20px 44px -20px #000000cc, 0 0 0 1px #f4f2ec0a` | card elevation |
| `--grain-opacity` | `0.06` | film-grain overlay strength |
| `--r` | `4px` | base radius (sharp, editorial) |

### After Hours — alternate (warm dark)
paper `#0E0C0B` · paper-2 `#161310` · card `#1A1613` · ink `#F3ECDD` · ink-soft `#B3A892` · ink-faint `#756B58` · accent `#E8862F` (amber) · accent-ink `#1A0F03` · accent-2 `#C13B2B` · good `#56C18B`

### Riso — alternate (light)
paper `#F4EBDD` · paper-2 `#ECE0CC` · card `#FBF5EA` · ink `#1A2740` · ink-soft `#4C5772` · ink-faint `#8C93A6` · accent `#FF5C8A` (fluoro pink) · accent-ink `#2A0E1A` · accent-2 `#2C4ED6` (cobalt) · good `#1f9d6b`

> The film-grain overlay uses `mix-blend-mode: screen` on dark themes (Midnight, After Hours) and `multiply` on light (Riso). See `body::after` in `app/theme.css`.

---

## Typography

All Google Fonts (loaded in the HTML `<head>`):

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 700–800 | titles, the big "500", odometer numbers. `letter-spacing: -0.02em`, `line-height: ~0.98` |
| Body / UI | **Spline Sans** | 400–700 | default UI text |
| Mono | **Space Mono** | 400 / 700 | catalog numbers, ranks, week keys (e.g. `2026-W23`), eyebrows/tags (uppercase, letter-spaced) |
| Quote / serif | **Newsreader** | 400–600, incl. italic | one-line "takes", descriptive copy |

**Minimum sizes:** 14px UI text, 11px mono labels. Headings use the display font at `font-weight: 800`.

---

## Layout system & motifs

- **Sharp, editorial feel:** small radii (3–8px), tight low shadows, hairline borders from `--line` / `--line-strong`.
- **Film grain:** subtle SVG noise overlay across the whole canvas (`body::after`), blend mode per theme.
- **Navigation:** **top bar on desktop, bottom tab bar on mobile**, breakpoint **760px**. (`app/app.jsx` → `TopNav`, `BottomNav`, `NAV`.)
- **Avatars:** initials on an `oklch` hue derived per member.
- **Grids:** card grids use CSS `auto-fill` / `auto-fit` with `minmax(...)` so they reflow responsively.

---

## Screens / Views

Single authenticated shell: 4 primary routes + an album-detail overlay + an auth gate.

### Auth (`app/screens-auth.jsx`)
- **Two-column split** (stacks to one column under ~720px via `auto-fit minmax(360px,1fr)`).
- **Left = brand marquee.** On the dark default it is a **lifted near-black panel** (`background: var(--paper-2)`, light ink) — NOT inverted to white. Contains: the `RSD 500` brand mark, oversized display type "500 / albums. / one / at a time." (the "albums." in accent), a horizontal scanline texture (`repeating-linear-gradient` in `--ink` at ~7% opacity), a slow **spinning-record** motif bottom-right (`spin360`, 14s), and a mono footer ("INVITE ONLY · N IN THE CREW").
- **Right = form.** Segmented toggle (Join with code / Log in). Signup fields: invite code (mono, uppercased), display name, email, password. Inline error in accent on invalid input.

### My Week — the draw experience (`app/screens-week.jsx`)
The signature screen.
- **Status strip:** mono eyebrow ("THIS IS YOUR DRAW · 2026 W23"), big "My Week" title, three stats (picks kept / skips logged / pool left).
- **The Draw Machine** — bordered card with a perforated dashed header:
  - **idle:** vinyl graphic + "Pull a record from the crate." + accent **DRAW THIS WEEK** button.
  - **spinning:** record spins; a mono odometer scrambles catalog numbers (`#xxx`) and decelerates over ~1.9s, locking on the drawn rank. (Scramble is cosmetic.)
  - **presented:** sleeve flips in (3D `rotateY` via `flipIn`); title/artist/rank shown; then "Have you already heard this one?" → **No** (keep as fresh) / **Yes** (rate, then redraw).
  - **rate-skip:** rating input (1–10 buttons, or 5-star halves) + optional one-line take.
  - **kept / blocked:** success state, or the "one open fresh pick at a time" guard message.
- **Now-listening card:** appears when you have an open fresh pick; "I've finished — rate it" reveals the rate form.

### The Board (`app/screens-board.jsx`)
- Header (LIVE badge + week + counts), a live-event ticker line, responsive card grid (`repeat(auto-fill, minmax(290px,1fr))`).
- **Card:** member avatar + name; status = pulsing "listening" OR the score; cover thumbnail; rank·year; title/artist; one-line take (italic serif); reaction row (emoji popover) + "Play on Spotify"; pinned first comment. Your own empty slot shows a "Draw your pick →" CTA.

### History (`app/screens-history.jsx`)
- Members × weeks scorecard. Sticky left column of members; one column per ISO week; each cell = cover thumbnail with score overlaid (or a listening dot); trailing **avg** column.
- **Member detail:** tap a name → header (avatar + stats) + reverse-chronological list of everything logged, each linking to album detail.

### Stats (`app/screens-stats.jsx`)
Cards: **Harshest rater** / **Most generous** (avg score), **Deepest crate** (most logged); a **public skip-count meter** (bars per member); **Crew high / Crew low** albums; **Most divisive** (biggest score spread on one album).

### The 500 — catalog browser (`app/screens-catalog.jsx`)
- Read-only browse of the full list. Header + stats (showing / you've logged), search box, filter segmented control (All / Logged / Unlogged / Heard), then a **sortable table**.
- Sortable headers (rank #, Album, Artist, Year, You) toggle asc/desc with an arrow indicator. Each row: rank, cover thumb, title, artist, year, your status. Row click → album detail.
- Search = case-insensitive substring on title + artist. Sort keys: rank, year, title, artist (ignoring a leading "the "), your score. **Responsive:** under 640px the artist/year columns collapse and artist shows inline under the title.

### Album detail (`app/screens-detail.jsx`)
Big cover, **Play on Spotify** button, RS rank/year, crew average + count, "who drew it" list, and a crew thread (reactions + short comments + composer). Reached by tapping any cover.

---

## Interactions & motion

- **Draw reveal:** `setTimeout`-driven spin + odometer (survives backgrounded tabs), then a `flipIn` reveal of the sleeve. **Honor `prefers-reduced-motion`** — the stylesheet already collapses animation durations under it.
- **Reactions:** "+" opens an emoji popover (🔥 💯 ❤️ 🤯 😵 🎷 👀 😴); selecting adds a reaction chip.
- **Hover/active:** buttons darken/lift subtly; sortable headers show a sort arrow; rows highlight on hover.
- **Keyframes** (in `app/theme.css`): `spin360`, `riseIn`, `flipIn`, `pulse` (listening dot), `liveBlink` (LIVE badge).
- **Responsive:** desktop top-nav + multi-column grids; mobile bottom tab bar + single column at the 760px / 720px / 640px breakpoints noted above.

---

## Reusable components (`app/components.jsx`)
`Avatar`, `ScoreBadge`, `RatingInput`, `Btn` (variants incl. `accent`, sizes incl. `lg`, `full`), `ReactionRow`, `Eyebrow`. Plus `BrandMark` in `app/screens-auth.jsx`. Recreate these as shared components in your framework.

**Rating scale** is a single config constant (default integer 1–10) and the prototype can also render 5-star-halves (`ratingMode`) — choose one final mode for production.

---

## Files in this bundle

| File | What it is |
|---|---|
| `RSD 500 Randomizer.html` | Entry point — loads fonts, theme, scripts |
| `app/theme.css` | **Design tokens (3 themes), base styles, keyframes, responsive nav** |
| `app/data.js` | Placeholder sample data (visual scaffolding only) |
| `app/sleeves.jsx` | Placeholder procedural cover art |
| `app/components.jsx` | Shared UI: Avatar, ScoreBadge, RatingInput, Btn, ReactionRow, Eyebrow |
| `app/screens-week.jsx` | My Week + the draw state machine |
| `app/screens-board.jsx` | The Board |
| `app/screens-catalog.jsx` | The 500 catalog browser |
| `app/screens-history.jsx` | History grid + member detail |
| `app/screens-stats.jsx` | Stats |
| `app/screens-detail.jsx` | Album detail |
| `app/screens-auth.jsx` | Auth / invite signup + `BrandMark` |
| `app/app.jsx` | Root, routing, nav, demo realtime, tweaks |
| `tweaks-panel.jsx` | Dev tweak-panel scaffold (not needed in prod) |

**To view the prototype:** open `RSD 500 Randomizer.html` in a browser (needs internet for font/React CDNs). Sign up with invite code `VINYL-NIGHT`.

---

## Reference screenshots (`screens/`)

High-res captures of each screen in the default **Midnight** theme — use these as the visual target.

| File | Screen |
|---|---|
| `screens/01-auth.png` | Auth / invite signup (split layout) |
| `screens/02-week.png` | My Week — the draw machine (idle) |
| `screens/03-board.png` | The Board — live crew grid |
| `screens/04-catalog.png` | The 500 — catalog browser |
| `screens/05-history.png` | History — members × weeks grid |
| `screens/06-stats.png` | Stats |
| `screens/07-album-detail.png` | Album detail overlay |

---

## Tweaks (prototype-only dev affordance)
`app/app.jsx` → `TweakUI` exposes runtime toggles: **theme**, **accent color**, **reveal speed**, **rating-scale display**. These are design-decision toggles for exploration — pick final values for production; you do **not** need to ship a runtime tweak panel.
