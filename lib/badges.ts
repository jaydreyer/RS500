export const WRITTEN_REVIEW_MIN_LENGTH = 40;

export type BadgeTrack = "listening" | "writing";
export type BadgeState = "earned" | "next" | "locked";

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  threshold: number;
  track: BadgeTrack;
};

export type BadgeProgress = BadgeDefinition & {
  count: number;
  earnedAt: string | null;
  progress: number;
  remaining: number;
  state: BadgeState;
};

export type BadgeListen = {
  kind: "fresh" | "skip";
  status: "listening" | "rated";
  rating: number | null;
  take?: string;
  created: string;
  ratedAt: string | null;
};

export const LISTENING_BADGES: BadgeDefinition[] = [
  {
    id: "first-stack",
    name: "First Stack",
    description: "Complete 10 fresh picks.",
    threshold: 10,
    track: "listening",
  },
  {
    id: "crate-digger",
    name: "Crate Digger",
    description: "Complete 25 fresh picks.",
    threshold: 25,
    track: "listening",
  },
  {
    id: "heavy-rotation",
    name: "Heavy Rotation",
    description: "Complete 50 fresh picks.",
    threshold: 50,
    track: "listening",
  },
  {
    id: "century-club",
    name: "Century Club",
    description: "Complete 100 fresh picks.",
    threshold: 100,
    track: "listening",
  },
  {
    id: "halfway-there",
    name: "Halfway There",
    description: "Complete 250 fresh picks.",
    threshold: 250,
    track: "listening",
  },
  {
    id: "full-spin",
    name: "The Full Spin",
    description: "Complete 500 fresh picks.",
    threshold: 500,
    track: "listening",
  },
];

export const WRITING_BADGES: BadgeDefinition[] = [
  {
    id: "first-draft",
    name: "First Draft",
    description: "Write 5 album reviews.",
    threshold: 5,
    track: "writing",
  },
  {
    id: "liner-notes",
    name: "Liner Notes",
    description: "Write 25 album reviews.",
    threshold: 25,
    track: "writing",
  },
  {
    id: "staff-writer",
    name: "Staff Writer",
    description: "Write 50 album reviews.",
    threshold: 50,
    track: "writing",
  },
  {
    id: "resident-critic",
    name: "Resident Critic",
    description: "Write 100 album reviews.",
    threshold: 100,
    track: "writing",
  },
  {
    id: "long-form-legend",
    name: "Long-Form Legend",
    description: "Write 250 album reviews.",
    threshold: 250,
    track: "writing",
  },
];

export function buildBadgeProgress(
  listens: BadgeListen[],
  track: BadgeTrack,
): BadgeProgress[] {
  const definitions = track === "listening" ? LISTENING_BADGES : WRITING_BADGES;
  const qualifyingListens = listens.filter((listen) => qualifiesForTrack(listen, track));
  const chronologicalListens = qualifyingListens.toSorted((a, b) =>
    getCompletionDate(a).localeCompare(getCompletionDate(b)),
  );
  const count = chronologicalListens.length;
  const nextThreshold = definitions.find((badge) => count < badge.threshold)?.threshold ?? null;

  return definitions.map((badge) => {
    const earned = count >= badge.threshold;
    const earnedListen = earned ? chronologicalListens[badge.threshold - 1] : null;

    return {
      ...badge,
      count,
      earnedAt: earnedListen ? getCompletionDate(earnedListen) : null,
      progress: Math.min(count, badge.threshold),
      remaining: Math.max(0, badge.threshold - count),
      state: earned ? "earned" : badge.threshold === nextThreshold ? "next" : "locked",
    };
  });
}

export function countTrackProgress(listens: BadgeListen[], track: BadgeTrack) {
  return listens.filter((listen) => qualifiesForTrack(listen, track)).length;
}

function qualifiesForTrack(listen: BadgeListen, track: BadgeTrack) {
  const isCompletedFreshPick =
    listen.kind === "fresh" && listen.status === "rated" && listen.rating != null;

  if (!isCompletedFreshPick) {
    return false;
  }

  return track === "listening" || (listen.take?.trim().length ?? 0) >= WRITTEN_REVIEW_MIN_LENGTH;
}

function getCompletionDate(listen: BadgeListen) {
  return listen.ratedAt || listen.created;
}
