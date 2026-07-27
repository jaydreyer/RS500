export type StatsListen = {
  id: string;
  userId: string;
  albumId: string;
  groupDrawId: string | null;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
  rating: number | null;
  ratedAt: string | null;
  created: string;
  album: {
    id: string;
    rank: number;
    title: string;
    artist: string;
    year: number;
    coverUrl: string;
  };
};

const RATED_ALBUM_LEADERBOARD_LIMIT = 10;

export type StatsMember = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  email: string;
};

export type MemberSummary<TMember extends StatsMember = StatsMember, TListen extends StatsListen = StatsListen> = {
  member: TMember;
  listens: TListen[];
  loggedListens: TListen[];
  freshListens: TListen[];
  skipListens: TListen[];
  ratedFreshListens: TListen[];
  activeFreshListens: TListen[];
  completedFreshListens: TListen[];
  averageFreshRating: number | null;
};

export type AlbumRatingSummary<TListen extends StatsListen = StatsListen> = {
  album: TListen["album"];
  listens: TListen[];
  averageRating: number;
  ratingCount: number;
  spread: number;
};

export type GroupCompletionSummary<TListen extends StatsListen = StatsListen> = {
  groupDrawId: string;
  album: TListen["album"];
  listens: TListen[];
  startedAt: string;
  completedAt: string;
  completionMs: number;
};

export type HistoryStats<TMember extends StatsMember = StatsMember, TListen extends StatsListen = StatsListen> = {
  memberSummaries: MemberSummary<TMember, TListen>[];
  harshestRater: MemberSummary<TMember, TListen> | null;
  mostGenerousRater: MemberSummary<TMember, TListen> | null;
  mostAlbumsLogged: MemberSummary<TMember, TListen> | null;
  mostAssignedCompleted: MemberSummary<TMember, TListen> | null;
  highestRatedAlbums: TListen[];
  lowestRatedAlbums: TListen[];
  crewRankedAlbums: AlbumRatingSummary<TListen>[];
  provisionalAlbums: AlbumRatingSummary<TListen>[];
  sharedAlbums: AlbumRatingSummary<TListen>[];
  fastestGroupCompletions: GroupCompletionSummary<TListen>[];
};

export function buildMemberSummaries<
  TMember extends StatsMember,
  TListen extends StatsListen,
>(members: TMember[], listens: TListen[]): MemberSummary<TMember, TListen>[] {
  return members.map((member) => {
    const mine = listens.filter((listen) => listen.userId === member.id);
    const loggedListens = mine.filter(isLoggedListen);
    const freshListens = mine.filter((listen) => listen.kind === "fresh");
    const skipListens = mine.filter((listen) => listen.kind === "skip" && isLoggedListen(listen));
    const ratedFreshListens = freshListens.filter(isLoggedListen);
    const activeFreshListens = freshListens.filter((listen) => listen.status === "listening");
    const completedFreshListens = freshListens.filter(isLoggedListen);
    const averageFreshRating =
      ratedFreshListens.length > 0
        ? ratedFreshListens.reduce((total, listen) => total + (listen.rating ?? 0), 0) /
          ratedFreshListens.length
        : null;

    return {
      member,
      listens: mine,
      loggedListens,
      freshListens,
      skipListens,
      ratedFreshListens,
      activeFreshListens,
      completedFreshListens,
      averageFreshRating,
    };
  });
}

export function buildStats<
  TMember extends StatsMember,
  TListen extends StatsListen,
>(
  memberSummaries: MemberSummary<TMember, TListen>[],
  listens: TListen[],
  sampleThreshold = 3,
  crewRankMinReviews = 2,
): HistoryStats<TMember, TListen> {
  const sampleReady = memberSummaries.filter(
    (summary) => summary.ratedFreshListens.length >= sampleThreshold,
  );
  const loggedMembers = memberSummaries.filter((summary) => summary.loggedListens.length > 0);
  const assignedMembers = memberSummaries.filter(
    (summary) => summary.completedFreshListens.length > 0,
  );
  const albumSummaries = buildAlbumSummaries(listens);

  return {
    memberSummaries,
    harshestRater:
      sampleReady.toSorted(
        (a, b) => (a.averageFreshRating ?? 0) - (b.averageFreshRating ?? 0),
      )[0] ?? null,
    mostGenerousRater:
      sampleReady.toSorted(
        (a, b) => (b.averageFreshRating ?? 0) - (a.averageFreshRating ?? 0),
      )[0] ?? null,
    mostAlbumsLogged:
      loggedMembers.toSorted((a, b) => b.loggedListens.length - a.loggedListens.length)[0] ??
      null,
    mostAssignedCompleted:
      assignedMembers.toSorted(
        (a, b) => b.completedFreshListens.length - a.completedFreshListens.length,
      )[0] ?? null,
    highestRatedAlbums: buildRankedRatedListens(listens, "high").slice(
      0,
      RATED_ALBUM_LEADERBOARD_LIMIT,
    ),
    lowestRatedAlbums: buildRankedRatedListens(listens, "low").slice(
      0,
      RATED_ALBUM_LEADERBOARD_LIMIT,
    ),
    crewRankedAlbums: albumSummaries
      .filter((summary) => getReviewerCount(summary) >= crewRankMinReviews)
      .toSorted(compareCrewRankedAlbums),
    provisionalAlbums: albumSummaries
      .filter((summary) => getReviewerCount(summary) < crewRankMinReviews)
      .toSorted(compareCrewRankedAlbums),
    sharedAlbums: albumSummaries
      .filter((summary) => getReviewerCount(summary) >= crewRankMinReviews)
      .toSorted((a, b) => b.spread - a.spread || b.ratingCount - a.ratingCount)
      .slice(0, 5),
    fastestGroupCompletions: buildGroupCompletionSummaries(listens).slice(0, 5),
  };
}

export function compareCrewRankedAlbums<TListen extends StatsListen>(
  a: AlbumRatingSummary<TListen>,
  b: AlbumRatingSummary<TListen>,
) {
  return (
    b.averageRating - a.averageRating ||
    getReviewerCount(b) - getReviewerCount(a) ||
    a.album.rank - b.album.rank ||
    a.album.title.localeCompare(b.album.title) ||
    a.album.id.localeCompare(b.album.id)
  );
}

export function getReviewerCount<TListen extends StatsListen>(
  summary: AlbumRatingSummary<TListen>,
) {
  return new Set(summary.listens.map((listen) => listen.userId)).size;
}

export function buildRankedRatedListens<TListen extends StatsListen>(
  listens: TListen[],
  direction: "high" | "low",
): TListen[] {
  const rated = listens.filter(isLoggedListen);
  const ratingOrder =
    direction === "high"
      ? (a: TListen, b: TListen) => (b.rating ?? 0) - (a.rating ?? 0)
      : (a: TListen, b: TListen) => (a.rating ?? 0) - (b.rating ?? 0);

  return rated.toSorted(
    (a, b) =>
      ratingOrder(a, b) ||
      getListenSortDate(b).localeCompare(getListenSortDate(a)) ||
      a.album.title.localeCompare(b.album.title) ||
      a.id.localeCompare(b.id),
  );
}

export function buildAlbumSummaries<TListen extends StatsListen>(
  listens: TListen[],
): AlbumRatingSummary<TListen>[] {
  const rated = listens.filter(isLoggedListen);
  const byAlbum = new Map<string, TListen[]>();

  for (const listen of rated) {
    byAlbum.set(listen.albumId, [...(byAlbum.get(listen.albumId) ?? []), listen]);
  }

  return Array.from(byAlbum.values()).map((albumListens) => {
    const ratings = albumListens.map((listen) => listen.rating ?? 0);
    const averageRating =
      ratings.reduce((total, rating) => total + rating, 0) / ratings.length;

    return {
      album: albumListens[0].album,
      listens: albumListens,
      averageRating,
      ratingCount: ratings.length,
      spread: Math.max(...ratings) - Math.min(...ratings),
    };
  });
}

export function buildGroupCompletionSummaries<TListen extends StatsListen>(
  listens: TListen[],
): GroupCompletionSummary<TListen>[] {
  const byGroupDraw = new Map<string, TListen[]>();

  for (const listen of listens) {
    if (!listen.groupDrawId || listen.kind !== "fresh") {
      continue;
    }

    byGroupDraw.set(listen.groupDrawId, [
      ...(byGroupDraw.get(listen.groupDrawId) ?? []),
      listen,
    ]);
  }

  return Array.from(byGroupDraw.entries())
    .map(([groupDrawId, groupListens]) => {
      if (
        groupListens.length === 0 ||
        groupListens.some((listen) => !isLoggedListen(listen) || !listen.ratedAt)
      ) {
        return null;
      }

      const startedAt = groupListens
        .map((listen) => listen.created)
        .filter(Boolean)
        .toSorted()[0];
      const completedAt = groupListens
        .map((listen) => listen.ratedAt)
        .filter((value): value is string => Boolean(value))
        .toSorted()
        .at(-1);

      if (!startedAt || !completedAt) {
        return null;
      }

      const startedMs = Date.parse(startedAt);
      const completedMs = Date.parse(completedAt);

      if (!Number.isFinite(startedMs) || !Number.isFinite(completedMs)) {
        return null;
      }

      return {
        groupDrawId,
        album: groupListens[0].album,
        listens: groupListens,
        startedAt,
        completedAt,
        completionMs: Math.max(0, completedMs - startedMs),
      };
    })
    .filter((summary): summary is GroupCompletionSummary<TListen> => Boolean(summary))
    .toSorted((a, b) => a.completionMs - b.completionMs);
}

function isLoggedListen(listen: StatsListen) {
  return listen.status === "rated" && listen.rating != null;
}

function getListenSortDate(listen: StatsListen) {
  return listen.ratedAt || listen.created || "";
}
