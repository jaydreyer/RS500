import "server-only";

import type PocketBase from "pocketbase";

import { getClubUserAvatarUrl, type ClubUser } from "@/lib/auth";
import { mapStoredRating } from "@/lib/listen-rating";
import { formatIsoWeekLabel, getIsoWeekKey } from "@/lib/week";

export type BoardMember = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
};

export type BoardAlbum = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  spotifyUrl: string;
  appleMusicUrl: string;
};

export type BoardListen = {
  id: string;
  userId: string;
  albumId: string;
  groupDrawId: string | null;
  status: "listening" | "rated";
  rating: number | null;
  take: string;
  week: string;
  ratedAt: string | null;
  created: string;
  album: BoardAlbum;
};

export type BoardReaction = {
  id: string;
  listenId: string;
  userId: string;
  emoji: string;
  comment: string;
  created: string;
  updated: string;
  user: BoardMember;
};

export type BoardState = {
  currentUser: ClubUser;
  weekKey: string;
  weekLabel: string;
  members: BoardMember[];
  listens: BoardListen[];
  reactions: BoardReaction[];
};

type RecordLike = {
  id: string;
  created?: string;
  updated?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getBoardState(
  pb: PocketBase,
  currentUser: ClubUser,
): Promise<BoardState> {
  const weekKey = getIsoWeekKey();
  const [members, listens] = await Promise.all([
    pb.collection("users").getFullList({
      sort: "display_name,email",
      requestKey: null,
    }),
    pb.collection("listens").getFullList({
      filter: pb.filter('week = {:week} && kind = "fresh"', { week: weekKey }),
      expand: "album,user",
      sort: "-created",
      requestKey: null,
    }),
  ]);

  const mappedListens = listens.map((listen) => mapListen(listen));
  const reactions = await getReactionsForListens(
    pb,
    mappedListens.map((listen) => listen.id),
  );

  return {
    currentUser,
    weekKey,
    weekLabel: formatIsoWeekLabel(weekKey),
    members: members.map((member) => mapMember(member)),
    listens: mappedListens,
    reactions,
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

function mapListen(record: RecordLike): BoardListen {
  const status = record.status === "rated" ? "rated" : "listening";

  return {
    id: record.id,
    userId: asString(record.user),
    albumId: asString(record.album),
    groupDrawId: asNullableString(record.group_draw),
    status,
    rating: mapStoredRating(status, record.rating),
    take: asString(record.take),
    week: asString(record.week),
    ratedAt: asNullableString(record.rated_at),
    created: asString(record.created),
    album: mapAlbum(getExpandedRecord(record, "album")),
  };
}

function mapReaction(record: RecordLike): BoardReaction {
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

function mapAlbum(record: RecordLike): BoardAlbum {
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

function mapMember(record: RecordLike): BoardMember {
  const displayName =
    asString(record.display_name) || asString(record.name) || asString(record.email) || "Crew";

  return {
    id: record.id,
    displayName,
    initials: getInitials(displayName || asString(record.email)),
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
