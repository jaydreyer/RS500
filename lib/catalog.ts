import "server-only";

import type PocketBase from "pocketbase";

export type CatalogAlbum = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  spotifyUrl: string;
  appleMusicUrl: string;
};

export type CatalogListen = {
  id: string;
  userId: string;
  albumId: string;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
  rating: number | null;
  take: string;
  week: string;
  ratedAt: string | null;
  created: string;
};

export type CatalogState = {
  albums: CatalogAlbum[];
  myListens: CatalogListen[];
};

export type AlbumDetailMember = {
  id: string;
  displayName: string;
  initials: string;
};

export type AlbumDetailListen = CatalogListen & {
  user: AlbumDetailMember;
};

export type AlbumDetailReaction = {
  id: string;
  listenId: string;
  userId: string;
  emoji: string;
  comment: string;
  created: string;
  updated: string;
  user: AlbumDetailMember;
};

export type AlbumDetailState = {
  album: CatalogAlbum;
  listens: AlbumDetailListen[];
  reactions: AlbumDetailReaction[];
  crewAverage: number | null;
  ratedCount: number;
};

type RecordLike = {
  id: string;
  created?: string;
  updated?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getCatalogState(
  pb: PocketBase,
  userId: string,
): Promise<CatalogState> {
  const [albums, myListens] = await Promise.all([
    pb.collection("albums").getFullList({
      sort: "rank",
      requestKey: null,
    }),
    pb.collection("listens").getFullList({
      filter: pb.filter("user = {:user}", { user: userId }),
      sort: "-created",
      requestKey: null,
    }),
  ]);

  return {
    albums: albums.map((album) => mapAlbum(album)),
    myListens: myListens.map((listen) => mapListen(listen)),
  };
}

export async function getAlbumDetailState(
  pb: PocketBase,
  albumId: string,
): Promise<AlbumDetailState> {
  const [album, listens] = await Promise.all([
    pb.collection("albums").getOne(albumId, {
      requestKey: null,
    }),
    pb.collection("listens").getFullList({
      filter: pb.filter("album = {:album}", { album: albumId }),
      expand: "user",
      sort: "-created",
      requestKey: null,
    }),
  ]);

  const mappedListens = listens.map((listen) => mapDetailListen(listen));
  const reactions = await getReactionsForListens(
    pb,
    mappedListens.map((listen) => listen.id),
  );
  const rated = mappedListens.filter((listen) => listen.rating != null);

  return {
    album: mapAlbum(album),
    listens: mappedListens,
    reactions,
    crewAverage:
      rated.length > 0
        ? rated.reduce((total, listen) => total + (listen.rating ?? 0), 0) / rated.length
        : null,
    ratedCount: rated.length,
  };
}

async function getReactionsForListens(pb: PocketBase, listenIds: string[]) {
  if (listenIds.length === 0) {
    return [];
  }

  const params = Object.fromEntries(listenIds.map((id, index) => [`listen${index}`, id]));
  const filter = listenIds.map((_, index) => `listen = {:listen${index}}`).join(" || ");

  const reactions = await pb.collection("reactions").getFullList({
    filter: pb.filter(filter, params),
    expand: "user",
    sort: "created",
    requestKey: null,
  });

  return reactions.map((reaction) => mapReaction(reaction));
}

function mapAlbum(record: RecordLike): CatalogAlbum {
  return {
    id: record.id,
    rank: asNumber(record.rank),
    title: asString(record.title),
    artist: asString(record.artist),
    year: asNumber(record.year),
    coverUrl: asString(record.cover_url),
    spotifyUrl: asString(record.spotify_url),
    appleMusicUrl: asString(record.apple_music_url),
  };
}

function mapListen(record: RecordLike): CatalogListen {
  return {
    id: record.id,
    userId: asString(record.user),
    albumId: asString(record.album),
    kind: record.kind === "skip" ? "skip" : "fresh",
    status: record.status === "rated" ? "rated" : "listening",
    rating: typeof record.rating === "number" ? record.rating : null,
    take: asString(record.take),
    week: asString(record.week),
    ratedAt: asNullableString(record.rated_at),
    created: asString(record.created),
  };
}

function mapDetailListen(record: RecordLike): AlbumDetailListen {
  return {
    ...mapListen(record),
    user: mapMember(getExpandedRecord(record, "user")),
  };
}

function mapReaction(record: RecordLike): AlbumDetailReaction {
  return {
    id: record.id,
    listenId: asString(record.listen),
    userId: asString(record.user),
    emoji: asString(record.emoji),
    comment: asString(record.comment),
    created: asString(record.created),
    updated: asString(record.updated),
    user: mapMember(getExpandedRecord(record, "user")),
  };
}

function mapMember(record: RecordLike): AlbumDetailMember {
  const displayName =
    asString(record.display_name) || asString(record.name) || asString(record.email) || "Crew";

  return {
    id: record.id,
    displayName,
    initials: getInitials(displayName || asString(record.email)),
  };
}

function getExpandedRecord(record: RecordLike, key: string): RecordLike {
  const expanded = record.expand?.[key];
  const value = Array.isArray(expanded) ? expanded[0] : expanded;

  if (!value || typeof value !== "object" || !("id" in value)) {
    throw new Error(`Missing expanded ${key} data.`);
  }

  return value as RecordLike;
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "??";
  }

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const stringValue = asString(value);
  return stringValue || null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
