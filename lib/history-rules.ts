export type StatsListen = {
  id: string;
  userId: string;
  albumId: string;
  kind: "fresh" | "skip";
  rating: number | null;
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
  email: string;
};

export type MemberSummary<TMember extends StatsMember = StatsMember, TListen extends StatsListen = StatsListen> = {
  member: TMember;
  listens: TListen[];
  freshListens: TListen[];
  skipListens: TListen[];
  ratedFreshListens: TListen[];
  averageFreshRating: number | null;
};

export type AlbumRatingSummary<TListen extends StatsListen = StatsListen> = {
  album: TListen["album"];
  listens: TListen[];
  averageRating: number;
  ratingCount: number;
  spread: number;
};

export type HistoryStats<TMember extends StatsMember = StatsMember, TListen extends StatsListen = StatsListen> = {
  memberSummaries: MemberSummary<TMember, TListen>[];
  harshestRater: MemberSummary<TMember, TListen> | null;
  mostGenerousRater: MemberSummary<TMember, TListen> | null;
  mostAlbumsLogged: MemberSummary<TMember, TListen> | null;
  highestRatedAlbums: AlbumRatingSummary<TListen>[];
  lowestRatedAlbums: AlbumRatingSummary<TListen>[];
  sharedAlbums: AlbumRatingSummary<TListen>[];
};

export function buildMemberSummaries<
  TMember extends StatsMember,
  TListen extends StatsListen,
>(members: TMember[], listens: TListen[]): MemberSummary<TMember, TListen>[] {
  return members.map((member) => {
    const mine = listens.filter((listen) => listen.userId === member.id);
    const freshListens = mine.filter((listen) => listen.kind === "fresh");
    const skipListens = mine.filter((listen) => listen.kind === "skip");
    const ratedFreshListens = freshListens.filter((listen) => listen.rating != null);
    const averageFreshRating =
      ratedFreshListens.length > 0
        ? ratedFreshListens.reduce((total, listen) => total + (listen.rating ?? 0), 0) /
          ratedFreshListens.length
        : null;

    return {
      member,
      listens: mine,
      freshListens,
      skipListens,
      ratedFreshListens,
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
): HistoryStats<TMember, TListen> {
  const sampleReady = memberSummaries.filter(
    (summary) => summary.ratedFreshListens.length >= sampleThreshold,
  );
  const loggedMembers = memberSummaries.filter((summary) => summary.listens.length > 0);
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
      loggedMembers.toSorted((a, b) => b.listens.length - a.listens.length)[0] ?? null,
    highestRatedAlbums: albumSummaries
      .toSorted((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount)
      .slice(0, 5),
    lowestRatedAlbums: albumSummaries
      .toSorted((a, b) => a.averageRating - b.averageRating || b.ratingCount - a.ratingCount)
      .slice(0, 5),
    sharedAlbums: albumSummaries
      .filter((summary) => new Set(summary.listens.map((listen) => listen.userId)).size >= 2)
      .toSorted((a, b) => b.spread - a.spread || b.ratingCount - a.ratingCount)
      .slice(0, 5),
  };
}

export function buildAlbumSummaries<TListen extends StatsListen>(
  listens: TListen[],
): AlbumRatingSummary<TListen>[] {
  const rated = listens.filter((listen) => listen.rating != null);
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
