import "server-only";

import { randomInt } from "crypto";

import type PocketBase from "pocketbase";

import { createSuperuserPocketBase, getClubUserAvatarUrl } from "@/lib/auth";
import {
  assertGroupCanDraw,
  getActiveGroupDrawMembers,
  getGroupDrawablePool,
  GroupDrawRuleError,
  type GroupDrawRuleListen,
} from "@/lib/group-draw-rules";
import type {
  CurrentGroupDraw,
  GroupDrawAlbum,
  GroupDrawMember,
  UserGroupDraw,
  UserGroupDrawState,
} from "@/lib/group-draw-types";
import { getIsoWeekKey } from "@/lib/week";

export { GroupDrawRuleError } from "@/lib/group-draw-rules";

type RecordLike = {
  id: string;
  created?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getUserGroupDrawState(userId: string): Promise<UserGroupDrawState> {
  const pb = await createSuperuserPocketBase();
  const weekKey = getIsoWeekKey();
  const memberships = await pb.collection("group_members").getFullList({
    filter: pb.filter("user = {:user} && active = true", { user: userId }),
    expand: "group",
    sort: "created",
    requestKey: null,
  });

  const activeGroups = memberships
    .map((membership) => getExpandedRecord(membership, "group"))
    .filter((group) => group.active === true);

  const groups = await Promise.all(
    activeGroups.map((group) => getGroupDrawSummary(pb, group)),
  );

  return {
    weekKey,
    groups,
  };
}

export async function getAllGroupDrawState(): Promise<UserGroupDrawState> {
  const pb = await createSuperuserPocketBase();
  const weekKey = getIsoWeekKey();
  const activeGroups = await pb.collection("groups").getFullList({
    filter: "active = true",
    sort: "name",
    requestKey: null,
  });
  const groups = await Promise.all(
    activeGroups.map((group) => getGroupDrawSummary(pb, group)),
  );

  return {
    weekKey,
    groups,
  };
}

export async function drawForGroup({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const pb = await createSuperuserPocketBase();
  const weekKey = getIsoWeekKey();
  const group = await getGroupForMember(pb, groupId, userId);
  const summary = await getGroupDrawSummary(pb, group);

  assertGroupCanDraw({
    activeMembers: summary.members,
    blockedMembers: summary.blockedMembers,
    poolSize: summary.poolLeft,
  });

  const { pool } = await getGroupPoolData(pb, summary.members);
  if (pool.length === 0) {
    throw new GroupDrawRuleError("This group has no shared albums left to draw.");
  }
  const album = pool[randomInt(pool.length)];
  let groupDrawId: string | null = null;
  const listenIds: string[] = [];

  try {
    const groupDraw = await pb.collection("group_draws").create(
      {
        group: group.id,
        album: album.id,
        week: weekKey,
        created_by: userId,
      },
      { requestKey: null },
    );
    groupDrawId = groupDraw.id;

    for (const member of summary.members) {
      const listen = await pb.collection("listens").create(
        {
          user: member.id,
          album: album.id,
          kind: "fresh",
          status: "listening",
          take: "",
          week: weekKey,
          group_draw: groupDraw.id,
        },
        { requestKey: null },
      );
      listenIds.push(listen.id);
    }

    const createdDraw = await pb.collection("group_draws").getOne(groupDraw.id, {
      expand: "album",
      requestKey: null,
    });

    return {
      group: {
        id: summary.id,
        name: summary.name,
      },
      draw: mapCurrentDraw(createdDraw),
      members: summary.members,
    };
  } catch (error) {
    await rollbackGroupDraw(pb, groupDrawId, listenIds);

    if (error instanceof GroupDrawRuleError) {
      throw error;
    }

    throw new GroupDrawRuleError("Group draw could not be saved. Refresh and try again.");
  }
}

export function parseGroupId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new GroupDrawRuleError("Missing group information. Refresh and try again.");
  }

  return value.trim();
}

async function getGroupForMember(pb: PocketBase, groupId: string, userId: string) {
  let membership: RecordLike;

  try {
    membership = await pb.collection("group_members").getFirstListItem(
      pb.filter("group = {:group} && user = {:user} && active = true", {
        group: groupId,
        user: userId,
      }),
      {
        expand: "group",
        requestKey: null,
      },
    );
  } catch {
    throw new GroupDrawRuleError("You are not an active member of that group.");
  }

  const group = getExpandedRecord(membership, "group");
  if (group.active !== true) {
    throw new GroupDrawRuleError("That group is not active.");
  }

  return group;
}

async function getGroupDrawSummary(
  pb: PocketBase,
  group: RecordLike,
): Promise<UserGroupDraw> {
  const members = await getActiveGroupMembers(pb, group.id);
  const [poolData, currentDraw] = await Promise.all([
    getGroupPoolData(pb, members),
    getCurrentActiveGroupDraw(pb, group.id),
  ]);
  const { listens, pool } = poolData;
  const blockedMembers = getActiveGroupDrawMembers(members, listens, currentDraw?.id ?? null);

  return {
    id: group.id,
    name: asString(group.name) || "Group",
    slug: asString(group.slug),
    members,
    blockedMembers,
    currentDraw,
    poolLeft: pool.length,
  };
}

async function getActiveGroupMembers(pb: PocketBase, groupId: string): Promise<GroupDrawMember[]> {
  const memberships = await pb.collection("group_members").getFullList({
    filter: pb.filter("group = {:group} && active = true", { group: groupId }),
    expand: "user",
    sort: "created",
    requestKey: null,
  });

  return memberships.map((membership) => mapMember(getExpandedRecord(membership, "user")));
}

async function getGroupPoolData(pb: PocketBase, members: GroupDrawMember[]) {
  const [albums, listens] = await Promise.all([getAlbums(pb), getListensForMembers(pb, members)]);

  return {
    albums,
    listens,
    pool: getGroupDrawablePool(albums, listens),
  };
}

async function getAlbums(pb: PocketBase): Promise<GroupDrawAlbum[]> {
  const albums = await pb.collection("albums").getFullList({
    sort: "rank",
    requestKey: null,
  });

  return albums.map((album) => mapAlbum(album));
}

async function getListensForMembers(
  pb: PocketBase,
  members: GroupDrawMember[],
): Promise<GroupDrawRuleListen[]> {
  if (members.length === 0) {
    return [];
  }

  const params = Object.fromEntries(members.map((member, index) => [`user${index}`, member.id]));
  const filter = members.map((_, index) => `user = {:user${index}}`).join(" || ");
  const listens = await pb.collection("listens").getFullList({
    filter: pb.filter(filter, params),
    requestKey: null,
  });

  return listens.map((listen) => ({
    userId: asString(listen.user),
    albumId: asString(listen.album),
    groupDrawId: asNullableString(listen.group_draw),
    kind: listen.kind === "skip" ? "skip" : "fresh",
    status: listen.status === "rated" ? "rated" : "listening",
  }));
}

async function getCurrentActiveGroupDraw(
  pb: PocketBase,
  groupId: string,
): Promise<CurrentGroupDraw | null> {
  const draws = await pb.collection("group_draws").getFullList({
    filter: pb.filter("group = {:group}", { group: groupId }),
    expand: "album",
    sort: "-created",
    requestKey: null,
  });

  for (const draw of draws) {
    try {
      await pb.collection("listens").getFirstListItem(
        pb.filter('group_draw = {:groupDraw} && status = "listening"', {
          groupDraw: draw.id,
        }),
        {
          requestKey: null,
        },
      );

      return mapCurrentDraw(draw);
    } catch {
      continue;
    }
  }

  return null;
}

async function rollbackGroupDraw(
  pb: PocketBase,
  groupDrawId: string | null,
  listenIds: string[],
) {
  await Promise.allSettled(
    listenIds.map((listenId) =>
      pb.collection("listens").delete(listenId, {
        requestKey: null,
      }),
    ),
  );

  if (groupDrawId) {
    await pb.collection("group_draws").delete(groupDrawId, {
      requestKey: null,
    });
  }
}

function mapCurrentDraw(record: RecordLike): CurrentGroupDraw {
  return {
    id: record.id,
    groupId: asString(record.group),
    albumId: asString(record.album),
    week: asString(record.week),
    createdById: asString(record.created_by),
    created: asString(record.created),
    album: mapAlbum(getExpandedRecord(record, "album")),
  };
}

function mapAlbum(record: RecordLike): GroupDrawAlbum {
  return {
    id: record.id,
    rank: asNumber(record.rank),
    title: asString(record.title),
    artist: asString(record.artist),
    year: asNumber(record.year),
    coverUrl: asString(record.cover_url),
  };
}

function mapMember(record: RecordLike): GroupDrawMember {
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
    throw new GroupDrawRuleError(`Missing expanded ${key} data.`);
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

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asNullableString(value: unknown) {
  const stringValue = asString(value);
  return stringValue || null;
}
