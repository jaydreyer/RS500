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

export type StatsMember = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  isDeactivated?: boolean;
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

export type MemberCrewComparison<TListen extends StatsListen = StatsListen> = {
  summary: AlbumRatingSummary<TListen>;
  memberRating: number;
  otherCrewAverage: number;
  otherRatingCount: number;
  difference: number;
};

export type DecadeSummary = {
  decade: number;
  averageRating: number;
  ratingCount: number;
  albumCount: number;
};

export type RankingMomentum<TListen extends StatsListen = StatsListen> = {
  ratingCount: number;
  albumCount: number;
  newlyRanked: Array<{
    summary: AlbumRatingSummary<TListen>;
    rankedAt: string;
  }>;
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
  crewRankedAlbums: AlbumRatingSummary<TListen>[];
  provisionalAlbums: AlbumRatingSummary<TListen>[];
  sharedAlbums: AlbumRatingSummary<TListen>[];
  strongestConsensus: AlbumRatingSummary<TListen>[];
  overlookedByRs: AlbumRatingSummary<TListen>[];
  rsClassicsCrewRatesLowest: AlbumRatingSummary<TListen>[];
  decadeSummaries: DecadeSummary[];
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
  const activeMemberSummaries = memberSummaries.filter(
    (summary) => !summary.member.isDeactivated,
  );
  const sampleReady = activeMemberSummaries.filter(
    (summary) => summary.ratedFreshListens.length >= sampleThreshold,
  );
  const loggedMembers = activeMemberSummaries.filter(
    (summary) => summary.loggedListens.length > 0,
  );
  const freshMembers = activeMemberSummaries.filter(
    (summary) => summary.completedFreshListens.length > 0,
  );
  const albumSummaries = buildAlbumSummaries(listens);
  const crewRankedAlbums = albumSummaries
    .filter((summary) => getReviewerCount(summary) >= crewRankMinReviews)
    .toSorted(compareCrewRankedAlbums);

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
      freshMembers.toSorted(
        (a, b) => b.completedFreshListens.length - a.completedFreshListens.length,
      )[0] ?? null,
    crewRankedAlbums,
    provisionalAlbums: albumSummaries
      .filter((summary) => getReviewerCount(summary) < crewRankMinReviews)
      .toSorted(compareCrewRankedAlbums),
    sharedAlbums: albumSummaries
      .filter((summary) => getReviewerCount(summary) >= crewRankMinReviews)
      .toSorted((a, b) => b.spread - a.spread || b.ratingCount - a.ratingCount)
      .slice(0, 5),
    strongestConsensus: crewRankedAlbums
      .filter((summary) => getReviewerCount(summary) >= 3)
      .toSorted(
        (a, b) =>
          a.spread - b.spread ||
          b.ratingCount - a.ratingCount ||
          b.averageRating - a.averageRating ||
          a.album.rank - b.album.rank,
      )
      .slice(0, 5),
    overlookedByRs: crewRankedAlbums
      .filter((summary) => summary.album.rank > 250)
      .slice(0, 5),
    rsClassicsCrewRatesLowest: crewRankedAlbums
      .filter((summary) => summary.album.rank <= 100)
      .toSorted(
        (a, b) =>
          a.averageRating - b.averageRating ||
          b.ratingCount - a.ratingCount ||
          a.album.rank - b.album.rank,
      )
      .slice(0, 5),
    decadeSummaries: buildDecadeSummaries(listens),
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

export function buildMemberCrewComparisons<TListen extends StatsListen>(
  crewRankedAlbums: AlbumRatingSummary<TListen>[],
  memberId: string,
  minOtherRatings = 2,
): MemberCrewComparison<TListen>[] {
  return crewRankedAlbums.flatMap((summary) => {
    const memberRatings = summary.listens
      .filter((listen) => listen.userId === memberId && isLoggedListen(listen))
      .map((listen) => listen.rating ?? 0);
    const otherRatingsByMember = new Map<string, number[]>();

    for (const listen of summary.listens) {
      if (listen.userId === memberId || !isLoggedListen(listen)) {
        continue;
      }

      const memberScores = otherRatingsByMember.get(listen.userId);

      if (memberScores) {
        memberScores.push(listen.rating ?? 0);
      } else {
        otherRatingsByMember.set(listen.userId, [listen.rating ?? 0]);
      }
    }

    const otherRatings = Array.from(otherRatingsByMember.values()).map(average);

    if (memberRatings.length === 0 || otherRatings.length < minOtherRatings) {
      return [];
    }

    const memberRating = average(memberRatings);
    const otherCrewAverage = average(otherRatings);

    return [{
      summary,
      memberRating,
      otherCrewAverage,
      otherRatingCount: otherRatings.length,
      difference: memberRating - otherCrewAverage,
    }];
  });
}

export function buildDecadeSummaries<TListen extends StatsListen>(
  listens: TListen[],
): DecadeSummary[] {
  const byDecade = new Map<number, TListen[]>();

  for (const listen of listens) {
    if (!isLoggedListen(listen)) {
      continue;
    }

    const decade = Math.floor(listen.album.year / 10) * 10;
    const decadeListens = byDecade.get(decade);

    if (decadeListens) {
      decadeListens.push(listen);
    } else {
      byDecade.set(decade, [listen]);
    }
  }

  return Array.from(byDecade.entries())
    .map(([decade, decadeListens]) => ({
      decade,
      averageRating: average(decadeListens.map((listen) => listen.rating ?? 0)),
      ratingCount: decadeListens.length,
      albumCount: new Set(decadeListens.map((listen) => listen.albumId)).size,
    }))
    .toSorted((a, b) => a.decade - b.decade);
}

export function buildRankingMomentum<TListen extends StatsListen>(
  crewRankedAlbums: AlbumRatingSummary<TListen>[],
  since: Date,
): RankingMomentum<TListen> {
  const sinceMs = since.getTime();
  const recentRatings = crewRankedAlbums.flatMap((summary) =>
    summary.listens.filter((listen) => {
      const ratedMs = listen.ratedAt ? Date.parse(listen.ratedAt) : Number.NaN;
      return Number.isFinite(ratedMs) && ratedMs >= sinceMs;
    }),
  );
  const newlyRanked = crewRankedAlbums
    .flatMap((summary) => {
      const orderedRatings = summary.listens
        .filter((listen) => listen.ratedAt)
        .toSorted((a, b) => (a.ratedAt ?? "").localeCompare(b.ratedAt ?? ""));
      const reviewers = new Set<string>();

      for (const listen of orderedRatings) {
        reviewers.add(listen.userId);

        if (reviewers.size >= 2 && listen.ratedAt) {
          return Date.parse(listen.ratedAt) >= sinceMs
            ? [{ summary, rankedAt: listen.ratedAt }]
            : [];
        }
      }

      return [];
    })
    .toSorted((a, b) => b.rankedAt.localeCompare(a.rankedAt));

  return {
    ratingCount: recentRatings.length,
    albumCount: new Set(recentRatings.map((listen) => listen.albumId)).size,
    newlyRanked,
  };
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

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
