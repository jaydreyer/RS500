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
