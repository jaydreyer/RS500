export type ReleaseNote = {
  date: string;
  title: string;
  summary: string;
  added?: readonly string[];
  improved?: readonly string[];
  fixed?: readonly string[];
};

export const releaseNotes = [
  {
    date: "2026-08-04",
    title: "Ideas get a proper feedback loop",
    summary:
      "Members can now share feedback privately, follow a response, and support curated ideas they would use too.",
    added: [
      "Ideas provides a curated board with plain-language statuses, owner responses, supporter counts, and optional use-case notes.",
      "My feedback keeps each submission, status update, and conversation together without exposing internal work.",
      "The admin feedback inbox supports public replies, private notes, duplicate grouping, idea publishing, and selective GitHub promotion.",
    ],
    improved: [
      "Meaningful feedback updates now appear as an unread indicator in navigation.",
    ],
  },
  {
    date: "2026-08-04",
    title: "Your reviews, yours to keep",
    summary:
      "Your Spin 500 history can now leave the app with you—ready for a personal backup, a spreadsheet, or whatever you want to build from it.",
    added: [
      "Export CSV appears beside Copy list on your own Reviews page, with another download option in Profile settings.",
      "Each export includes the Rolling Stone rank, album, artist, release year, score, review text, review date, listen type, and group-draw status.",
    ],
    improved: [
      "Dated, spreadsheet-friendly files make it easy to sort your listening history, keep a backup, or move your reviews into Excel, Numbers, or Google Sheets.",
      "Multiline reviews, punctuation, and special characters stay intact in the download.",
      "Exports are private: you can copy another member’s public rating list, but you can only download your own complete review data.",
    ],
  },
  {
    date: "2026-08-04",
    title: "Your ratings, ready to share",
    summary:
      "Member review pages now make it easy to see—and share—the albums someone has rated without all the review text.",
    added: [
      "Switch between the complete review feed and a compact list of album titles, artists, and scores.",
      "Copy any member’s ratings as clean plain text, ready to paste into a message, post, or document.",
    ],
    improved: [
      "List view has its own shareable address, and copied ratings follow the sort order currently on screen.",
    ],
  },
  {
    date: "2026-07-27",
    title: "Stats digs deeper",
    summary:
      "The crew’s ratings now reveal where Our 500 breaks from Rolling Stone, where everyone agrees, and where your taste stands apart.",
    added: [
      "Crew favorites overlooked by Rolling Stone and top-100 classics the crew rates lowest show where club taste departs from the canon.",
      "You vs. the crew highlights your closest matches, biggest disagreements, and average score distance without counting your own rating in the crew comparison.",
      "Strongest consensus, 30-day ranking momentum, and decade-by-decade ratings add new ways to read the club’s listening history.",
    ],
  },
  {
    date: "2026-07-27",
    title: "Achievements join the collection",
    summary:
      "Listening milestones and thoughtful written takes now earn collectible badges on Stats.",
    added: [
      "A six-badge listening track celebrates completed fresh picks from First Stack at 10 through The Full Spin at 500.",
      "A separate writing track rewards substantial album reviews, from First Draft at 5 through Long-Form Legend at 250.",
      "The badge case shows what is earned, what comes next, milestone dates, and live progress toward the next unlock.",
    ],
    improved: [
      "Already-heard quick scores do not count toward listening badges, and written-review badges require at least 40 characters.",
    ],
  },
  {
    date: "2026-07-27",
    title: "Stats finds the signal",
    summary:
      "Stats is easier to scan, clearer about what the numbers mean, and more focused on how the crew is moving through the 500.",
    added: [
      "Album insights now surface the crew’s favorites, misses, and most divisive records.",
    ],
    improved: [
      "The Our 500 preview shows five albums with a more prominent crew score.",
      "The full Our 500 ranking has focused views for ranked albums, one-review albums, and unheard albums, plus faster progressive loading.",
      "Crew progress, recent pace, active picks, and member superlatives have a tighter hierarchy with clearer labels and less repetition.",
    ],
    fixed: [
      "Deactivated members no longer appear in active-member progress or superlatives, while their historical album scores remain part of the crew record.",
    ],
  },
  {
    date: "2026-07-27",
    title: "Our 500 takes shape",
    summary:
      "The crew now has its own evolving order of the Rolling Stone 500, built from everyone’s album ratings.",
    added: [
      "Stats now opens with an Our 500 preview of the crew’s five highest-ranked eligible albums.",
      "The full Our 500 page includes ranked and needs-review views, album and artist search, and multiple sorting options.",
    ],
    improved: [
      "Albums enter the crew ranking after two members rate them, using the average of every crew score.",
      "Ties favor albums with more ratings, then the higher original Rolling Stone placement.",
      "Album details and compact member scores stay consistent between Stats and the full ranking, with overflow ratings available from album detail.",
    ],
  },
  {
    date: "2026-07-09",
    title: "Reviews make a list",
    summary:
      "Review writing now supports bulleted and numbered lists for takes that need a little structure.",
    added: [
      "Review and Feed editors now include bulleted and numbered list controls alongside bold and italic formatting.",
    ],
    improved: [
      "List formatting works across selected lines, toggles off cleanly, and switches directly between bullet and number styles.",
    ],
  },
  {
    date: "2026-07-09",
    title: "Review drafts survive sign-in",
    summary:
      "Long reviews are protected while you type, and active login sessions now stay active for the intended 30 days.",
    added: [
      "Ratings and review drafts are saved on the current device as they are written and restored after signing in again.",
    ],
    improved: [
      "Expired-session login returns members to the page where they were writing, including Google sign-in.",
      "Active sessions roll forward when PocketBase refreshes the authentication token.",
    ],
    fixed: [
      "Submitting a review after session expiry no longer destroys the unsaved review text.",
      "The PocketBase member token duration is restored from five days to 30 days.",
    ],
  },
  {
    date: "2026-07-08",
    title: "Login tab works harder",
    summary:
      "The auth screen now gives the Log in tab a direct URL fallback for browsers that do not switch modes reliably.",
    improved: [
      "The Log in tab now updates the address to `/auth?mode=login`, so members can land on the password login form directly.",
    ],
    fixed: [
      "Edge-only login tab clicks that appeared to do nothing now have a native navigation fallback.",
    ],
  },
  {
    date: "2026-07-01",
    title: "Cleaner review text",
    summary:
      "Review cards now read more naturally across the app without decorative quotation marks around every take.",
    improved: [
      "Album review text on Board, Reviews, and rating panels no longer appears wrapped in extra quotes.",
    ],
  },
  {
    date: "2026-06-27",
    title: "My Pick, group reviews, and emoji fixes",
    summary:
      "The draw flow is cleaner, group reviews stay in the shared review stream, and long reviews can include emoji safely.",
    added: [
      "My Pick now has the canonical `/pick` route, with the old route redirecting there for existing links.",
    ],
    improved: [
      "Calendar-period labels were removed from pick, board, review, stats, and documentation surfaces.",
      "Group draw picks stay in the group review flow instead of being treated like individual skips.",
    ],
    fixed: [
      "Long reviews are trimmed without splitting emoji characters.",
      "Active group members are blocked from solo draw creation at the draw service layer.",
    ],
  },
  {
    date: "2026-06-25",
    title: "Longer album reviews",
    summary:
      "Unleash your inner Lester Bangs and write up to 6,000 characters in album reviews.",
    added: [
      "Album reviews now support up to 6,000 characters, including spaces and line breaks.",
      "Review editors show a live character counter so members can see exactly how much room is left.",
    ],
    improved: [
      "Over-limit review text stays visible instead of being silently chopped during paste.",
      "Save buttons now explain whether a missing rating or an over-limit review is blocking the submission.",
    ],
  },
  {
    date: "2026-06-24",
    title: "Reviews display polish",
    summary:
      "A quick cleanup pass makes Reviews easier to scan and read after the reactions-and-replies launch.",
    improved: [
      "Reviews filter controls now have room for their dropdown labels across wide and mid-size layouts.",
      "Full review text now displays on Reviews and member review rows instead of being cut off behind an ellipsis.",
    ],
  },
  {
    date: "2026-06-24",
    title: "Reviews get reactions, replies, and filters",
    summary:
      "The old History surface is now Reviews, with more ways to find, react to, and talk about the crew's takes.",
    added: [
      "Full emoji reactions on Reviews using the same picker as the album review thread.",
      "One-level review replies on the Reviews page, plus display of album-page review comments there too.",
      "Search, member, score, and activity filters for the Reviews page.",
    ],
    improved: [
      "History is now labeled Reviews in navigation and page copy.",
      "Reviews can be sorted by date, score, most discussed, or most reacted.",
      "Local seed data now includes sample review replies for richer review-stack QA.",
    ],
    fixed: [
      "Local seeded covers from Cover Art Archive release URLs are allowed by Next image configuration.",
    ],
  },
  {
    date: "2026-06-23",
    title: "Group draws stay group-only",
    summary:
      "Members in an active group now stay in the shared draw flow, keeping solo picks from blocking the crew.",
    improved: [
      "The pick page shows group mode instead of the personal draw machine for active group members.",
      "Group members get a direct jump to the group draw cards when it is time to spin together.",
    ],
    fixed: [
      "Direct solo draw submissions are now rejected server-side while a member belongs to an active group.",
      "Removed an accidental active solo pick that was blocking a group redraw.",
    ],
  },
  {
    date: "2026-06-23",
    title: "Google sign-in joins the club",
    summary:
      "Members can now sign in with Google, while new accounts still stay invite-only.",
    added: [
      "Google account signup and login on the auth screen.",
      "Invite-code validation before creating a new Google-backed account.",
      "Server-side Google OAuth handling that keeps PocketBase user creation app-owned.",
    ],
    improved: [
      "Login sessions are friendlier on refresh, including local and mobile testing.",
      "Existing password users can link Google on first successful Google login by verified email.",
    ],
    fixed: [
      "Auth cookies now choose Secure based on the actual request context instead of production mode alone.",
      "The app content security policy now allows the Google sign-in handoff.",
    ],
  },
  {
    date: "2026-06-16",
    title: "Release notes get a home",
    summary:
      "App updates now live on their own page, so The Feed can stay focused on club conversation.",
    added: [
      "A dedicated What's New page with the newest updates first.",
      "A megaphone shortcut in the app header and account panel.",
    ],
    improved: [
      "Release notes no longer need to compete with posts, replies, reactions, and album chatter.",
    ],
  },
] as const satisfies readonly ReleaseNote[];

export const releaseNoteCount: number = releaseNotes.length;
export const hasReleaseNotes = releaseNoteCount > 0;
export const latestReleaseNoteId = releaseNotes[0] ? getReleaseNoteId(releaseNotes[0]) : "";

export function getReleaseNoteId(note: ReleaseNote) {
  return `${note.date}:${note.title}`;
}
