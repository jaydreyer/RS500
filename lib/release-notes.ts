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

export const releaseNoteCount = releaseNotes.length;
export const hasReleaseNotes = releaseNoteCount > 0;
