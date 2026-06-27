import "server-only";

import type PocketBase from "pocketbase";
import {
  getClubUserAvatarUrl,
  getClubUserDisplayName,
  getClubUserInitials,
} from "@/lib/auth";
import { mapStoredRating } from "@/lib/listen-rating";

export type CatalogAlbum = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  reviewLinks: AlbumReviewLink[];
};

export type AlbumReviewLink = {
  source: string;
  url: string;
  kind: string;
};

export type CatalogListen = {
  id: string;
  userId: string;
  albumId: string;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
  rating: number | null;
  take: string;
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
  avatarUrl: string | null;
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
  myListen: AlbumDetailListen | null;
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
  currentUserId: string,
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
    myListen: mappedListens.find((listen) => listen.userId === currentUserId) ?? null,
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
    reviewLinks: asReviewLinks(record.review_links),
  };
}

function mapListen(record: RecordLike): CatalogListen {
  const status = record.status === "rated" ? "rated" : "listening";

  return {
    id: record.id,
    userId: asString(record.user),
    albumId: asString(record.album),
    kind: record.kind === "skip" ? "skip" : "fresh",
    status,
    rating: mapStoredRating(status, record.rating),
    take: asString(record.take),
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
  const displayName = getClubUserDisplayName(record);

  return {
    id: record.id,
    displayName,
    initials: getClubUserInitials(record),
    avatarUrl: getClubUserAvatarUrl(record),
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

function asReviewLinks(value: unknown): AlbumReviewLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const source = asString(record.source);
      const url = asString(record.url);
      const kind = asString(record.kind) || "review";

      return source && url ? { source, url, kind } : null;
    })
    .filter((item): item is AlbumReviewLink => Boolean(item));
}
