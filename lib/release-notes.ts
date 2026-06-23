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
    date: "2026-06-23",
    title: "Group draws stay group-only",
    summary:
      "Members in an active group now stay in the shared draw flow, keeping solo picks from blocking the crew.",
    improved: [
      "The Week page shows group mode instead of the personal draw machine for active group members.",
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
