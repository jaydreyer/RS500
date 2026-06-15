import "server-only";

import type PocketBase from "pocketbase";

import {
  getClubUserAvatarUrl,
  getClubUserDisplayName,
  getClubUserInitials,
  isDeactivatedUserRecord,
  type ClubUser,
} from "@/lib/auth";
import { STATS_SAMPLE_THRESHOLD } from "@/lib/config";
import {
  buildMemberSummaries,
  buildStats,
  type AlbumRatingSummary as BaseAlbumRatingSummary,
  type HistoryStats as BaseHistoryStats,
  type MemberSummary as BaseMemberSummary,
  type StatsListen,
  type StatsMember,
} from "@/lib/history-rules";
import { mapStoredRating } from "@/lib/listen-rating";
import { formatIsoWeekLabel } from "@/lib/week";

export type HistoryMember = StatsMember;

export type HistoryAlbum = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
};

export type HistoryListen = StatsListen & {
  id: string;
  userId: string;
  albumId: string;
  groupDrawId: string | null;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
  rating: number | null;
  take: string;
  week: string;
  weekLabel: string;
  ratedAt: string | null;
  created: string;
  album: HistoryAlbum;
};

export type MemberSummary = BaseMemberSummary<HistoryMember, HistoryListen>;
export type AlbumRatingSummary = BaseAlbumRatingSummary<HistoryListen>;
export type HistoryStats = BaseHistoryStats<HistoryMember, HistoryListen>;

export type HistoryState = {
  currentUser: ClubUser;
  totalAlbums: number;
  members: HistoryMember[];
  weeks: string[];
  listens: HistoryListen[];
  freshGridListens: HistoryListen[];
  memberSummaries: MemberSummary[];
  stats: HistoryStats;
};

type RecordLike = {
  id: string;
  created?: string;
  updated?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getHistoryState(
  pb: PocketBase,
  currentUser: ClubUser,
): Promise<HistoryState> {
  const [members, listens, albumPage] = await Promise.all([
    pb.collection("users").getFullList({
      sort: "display_name,email",
      requestKey: null,
    }),
    pb.collection("listens").getFullList({
      expand: "album",
      sort: "-created",
      requestKey: null,
    }),
    pb.collection("albums").getList(1, 1, {
      requestKey: null,
    }),
  ]);

  const mappedMembers = members.map((member) => mapMember(member));
  const mappedListens = listens.map((listen) => mapListen(listen));
  const freshGridListens = mappedListens.filter(
    (listen) => listen.kind === "fresh" && listen.status === "rated" && listen.rating != null,
  );
  const weeks = Array.from(new Set(freshGridListens.map((listen) => listen.week))).sort((a, b) =>
    b.localeCompare(a),
  );
  const memberSummaries = buildMemberSummaries(mappedMembers, mappedListens);
  const stats = buildStats(memberSummaries, mappedListens, STATS_SAMPLE_THRESHOLD);

  return {
    currentUser,
    totalAlbums: albumPage.totalItems,
    members: mappedMembers,
    weeks,
    listens: mappedListens,
    freshGridListens,
    memberSummaries,
    stats,
  };
}

export function getMemberLabel(member: HistoryMember, currentUserId: string) {
  return member.id === currentUserId ? "You" : member.displayName;
}

export function formatAverage(value: number | null) {
  return value == null ? "-" : value.toFixed(1);
}

function mapListen(record: RecordLike): HistoryListen {
  const week = asString(record.week);
  const status = record.status === "rated" ? "rated" : "listening";

  return {
    id: record.id,
    userId: asString(record.user),
    albumId: asString(record.album),
    groupDrawId: asNullableString(record.group_draw),
    kind: record.kind === "skip" ? "skip" : "fresh",
    status,
    rating: mapStoredRating(status, record.rating),
    take: asString(record.take),
    week,
    weekLabel: formatIsoWeekLabel(week),
    ratedAt: asNullableString(record.rated_at),
    created: asString(record.created),
    album: mapAlbum(getExpandedRecord(record, "album")),
  };
}

function mapAlbum(record: RecordLike): HistoryAlbum {
  return {
    id: record.id,
    rank: asNumber(record.rank),
    title: asString(record.title),
    artist: asString(record.artist),
    year: asNumber(record.year),
    coverUrl: asString(record.cover_url),
  };
}

function mapMember(record: RecordLike): HistoryMember {
  const displayName = getClubUserDisplayName(record);
  const email = isDeactivatedUserRecord(record) ? "" : asString(record.email);

  return {
    id: record.id,
    displayName,
    initials: getClubUserInitials(record),
    avatarUrl: getClubUserAvatarUrl(record),
    email,
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
