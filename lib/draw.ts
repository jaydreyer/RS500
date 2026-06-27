import "server-only";

import { randomInt } from "crypto";
import type PocketBase from "pocketbase";

import { RATING_SCALE } from "@/lib/config";
import {
  assertActiveFreshListen,
  assertIndividualFreshListen,
  assertSoloDrawAllowed,
  countTakeCharacters,
  DrawRuleError,
  getDrawablePool,
  normalizeTake,
  parseRatingValue,
  TAKE_MAX_LENGTH,
} from "@/lib/draw-rules";
import { mapStoredRating } from "@/lib/listen-rating";
import { getIsoWeekKey } from "@/lib/week";

export { DrawRuleError } from "@/lib/draw-rules";

export type AlbumSummary = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  spotifyUrl: string;
  appleMusicUrl: string;
};

export type ListenSummary = {
  id: string;
  albumId: string;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
  rating: number | null;
  take: string;
  ratedAt: string | null;
  created: string;
  album: AlbumSummary;
};

export type PickState = {
  activeFresh: ListenSummary | null;
  freshCount: number;
  skipCount: number;
  poolLeft: number;
  totalAlbums: number;
};

type RecordLike = {
  id: string;
  created?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getPickState(pb: PocketBase, userId: string): Promise<PickState> {
  const [listens, albumPage] = await Promise.all([
    getUserListens(pb, userId),
    pb.collection("albums").getList(1, 1, { requestKey: null }),
  ]);

  const loggedAlbumIds = new Set(listens.map((listen) => String(listen.album)));
  const activeFreshRecord = listens.find(
    (listen) => listen.kind === "fresh" && listen.status === "listening",
  );

  return {
    activeFresh: activeFreshRecord ? mapListen(activeFreshRecord) : null,
    freshCount: listens.filter((listen) => listen.kind === "fresh").length,
    skipCount: listens.filter((listen) => listen.kind === "skip").length,
    poolLeft: Math.max(0, albumPage.totalItems - loggedAlbumIds.size),
    totalAlbums: albumPage.totalItems,
  };
}

export async function drawAlbum(pb: PocketBase, userId: string): Promise<ListenSummary> {
  await assertUserCanDrawSolo(pb, userId);

  const activeFresh = await getActiveFresh(pb, userId);
  if (activeFresh) {
    throw new DrawRuleError("Rate your active pick before drawing again.");
  }

  const [listens, albums] = await Promise.all([
    getUserListens(pb, userId),
    pb.collection("albums").getFullList({
      sort: "rank",
      requestKey: null,
    }),
  ]);

  const loggedAlbumIds = new Set(listens.map((listen) => String(listen.album)));
  const pool = getDrawablePool(albums, loggedAlbumIds);

  if (pool.length === 0) {
    throw new DrawRuleError("You've logged all available albums.");
  }

  const album = pool[randomInt(pool.length)];
  const created = await pb.collection("listens").create(
    {
      user: userId,
      album: album.id,
      kind: "fresh",
      status: "listening",
      take: "",
      week: getIsoWeekKey(),
    },
    { requestKey: null },
  );

  const listen = await pb.collection("listens").getOne(created.id, {
    expand: "album",
    requestKey: null,
  });

  return mapListen(listen);
}

export async function keepFreshPick(
  pb: PocketBase,
  userId: string,
  listenId: string,
): Promise<ListenSummary> {
  const listen = await getOwnedListen(pb, userId, listenId);
  assertActiveFresh(listen);

  return mapListen(listen);
}

export async function rateDrawnSkip({
  pb,
  userId,
  listenId,
  rating,
  take,
}: {
  pb: PocketBase;
  userId: string;
  listenId: string;
  rating: number;
  take: string;
}) {
  const listen = await getOwnedListen(pb, userId, listenId);
  assertIndividualFresh(listen);

  const updated = await pb.collection("listens").update(
    listenId,
    {
      kind: "skip",
      status: "rated",
      rating,
      take: normalizeTake(take),
      rated_at: new Date().toISOString(),
    },
    {
      expand: "album",
      requestKey: null,
    },
  );

  return mapListen(updated);
}

export async function replaceUnavailablePick({
  pb,
  userId,
  listenId,
}: {
  pb: PocketBase;
  userId: string;
  listenId: string;
}) {
  await assertUserCanDrawSolo(pb, userId);

  const listen = await getOwnedListen(pb, userId, listenId);
  assertIndividualFresh(listen);

  await pb.collection("listens").update(
    listenId,
    {
      kind: "skip",
      status: "rated",
      rating: null,
      take: "Unavailable on Spotify.",
      rated_at: new Date().toISOString(),
    },
    { requestKey: null },
  );

  return drawAlbum(pb, userId);
}

export async function rateFreshPick({
  pb,
  userId,
  listenId,
  rating,
  take,
}: {
  pb: PocketBase;
  userId: string;
  listenId: string;
  rating: number;
  take: string;
}) {
  const listen = await getOwnedListen(pb, userId, listenId);
  assertActiveFresh(listen);

  const updated = await pb.collection("listens").update(
    listenId,
    {
      status: "rated",
      rating,
      take: normalizeTake(take),
      rated_at: new Date().toISOString(),
    },
    {
      expand: "album",
      requestKey: null,
    },
  );

  return mapListen(updated);
}

export async function rateKnownAlbum({
  pb,
  userId,
  albumId,
  rating,
  take,
}: {
  pb: PocketBase;
  userId: string;
  albumId: string;
  rating: number;
  take: string;
}) {
  const existing = await getOwnedAlbumListen(pb, userId, albumId);
  const ratedAt = new Date().toISOString();

  if (existing) {
    const updated = await pb.collection("listens").update(
      existing.id,
      {
        status: "rated",
        rating,
        take: normalizeTake(take),
        rated_at: ratedAt,
      },
      {
        expand: "album",
        requestKey: null,
      },
    );

    return mapListen(updated);
  }

  try {
    await pb.collection("albums").getOne(albumId, { requestKey: null });
  } catch {
    throw new DrawRuleError("That album was not found.");
  }

  const created = await pb.collection("listens").create(
    {
      user: userId,
      album: albumId,
      kind: "skip",
      status: "rated",
      rating,
      take: normalizeTake(take),
      week: getIsoWeekKey(),
      rated_at: ratedAt,
    },
    { requestKey: null },
  );

  const listen = await pb.collection("listens").getOne(created.id, {
    expand: "album",
    requestKey: null,
  });

  return mapListen(listen);
}

export function parseRating(value: FormDataEntryValue | null) {
  return parseRatingValue(value, RATING_SCALE);
}

export function parseAlbumId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DrawRuleError("Missing album information. Refresh and try again.");
  }

  return value.trim();
}

export function parseListenId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DrawRuleError("Missing draw information. Refresh and try again.");
  }

  return value.trim();
}

export function parseTake(value: FormDataEntryValue | null) {
  const take = normalizeTake(typeof value === "string" ? value : "");

  if (countTakeCharacters(take) > TAKE_MAX_LENGTH) {
    throw new DrawRuleError(`Review must be ${TAKE_MAX_LENGTH.toLocaleString()} characters or less.`);
  }

  return take;
}

async function getUserListens(pb: PocketBase, userId: string): Promise<RecordLike[]> {
  return pb.collection("listens").getFullList({
    filter: pb.filter("user = {:user}", { user: userId }),
    expand: "album",
    sort: "-created",
    requestKey: null,
  });
}

async function assertUserCanDrawSolo(pb: PocketBase, userId: string) {
  const memberships = await pb.collection("group_members").getFullList({
    filter: pb.filter("user = {:user} && active = true", { user: userId }),
    expand: "group",
    requestKey: null,
  });
  const activeGroupCount = memberships.filter((membership) => {
    const group = getExpandedRecord(membership, "group");
    return group?.active === true;
  }).length;

  assertSoloDrawAllowed(activeGroupCount);
}

async function getActiveFresh(pb: PocketBase, userId: string) {
  try {
    return await pb.collection("listens").getFirstListItem(
      pb.filter('user = {:user} && kind = "fresh" && status = "listening"', {
        user: userId,
      }),
      {
        expand: "album",
        requestKey: null,
      },
    );
  } catch {
    return null;
  }
}

async function getOwnedListen(pb: PocketBase, userId: string, listenId: string) {
  try {
    return await pb.collection("listens").getFirstListItem(
      pb.filter("id = {:id} && user = {:user}", {
        id: listenId,
        user: userId,
      }),
      {
        expand: "album",
        requestKey: null,
      },
    );
  } catch {
    throw new DrawRuleError("That pick was not found for your account.");
  }
}

async function getOwnedAlbumListen(pb: PocketBase, userId: string, albumId: string) {
  try {
    return await pb.collection("listens").getFirstListItem(
      pb.filter("album = {:album} && user = {:user}", {
        album: albumId,
        user: userId,
      }),
      {
        expand: "album",
        requestKey: null,
      },
    );
  } catch {
    return null;
  }
}

function assertActiveFresh(listen: RecordLike) {
  assertActiveFreshListen({
    groupDrawId: asNullableString(listen.group_draw),
    kind: listen.kind === "skip" ? "skip" : "fresh",
    status: listen.status === "rated" ? "rated" : "listening",
  });
}

function assertIndividualFresh(listen: RecordLike) {
  assertIndividualFreshListen({
    groupDrawId: asNullableString(listen.group_draw),
    kind: listen.kind === "skip" ? "skip" : "fresh",
    status: listen.status === "rated" ? "rated" : "listening",
  });
}

function mapListen(record: RecordLike): ListenSummary {
  const album = getExpandedAlbum(record);
  const status = record.status === "rated" ? "rated" : "listening";

  return {
    id: record.id,
    albumId: String(record.album),
    kind: record.kind === "skip" ? "skip" : "fresh",
    status,
    rating: mapStoredRating(status, record.rating),
    take: typeof record.take === "string" ? record.take : "",
    ratedAt: typeof record.rated_at === "string" ? record.rated_at : null,
    created: typeof record.created === "string" ? record.created : "",
    album: mapAlbum(album),
  };
}

function getExpandedAlbum(record: RecordLike): RecordLike {
  const album = getExpandedRecord(record, "album", "Album data was not included with that pick.");

  return album;
}

function getExpandedRecord(record: RecordLike, key: string, missingMessage?: string): RecordLike {
  const expanded = record.expand?.[key];
  const value = Array.isArray(expanded) ? expanded[0] : expanded;

  if (!value || typeof value !== "object" || !("id" in value)) {
    throw new DrawRuleError(missingMessage ?? "Expanded data was not included.");
  }

  return value as RecordLike;
}

function mapAlbum(record: RecordLike): AlbumSummary {
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

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  const stringValue = asString(value).trim();
  return stringValue || null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
