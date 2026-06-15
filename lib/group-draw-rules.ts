export class GroupDrawRuleError extends Error {}

export type GroupDrawRuleAlbum = {
  id: string;
};

export type GroupDrawRuleMember = {
  id: string;
  displayName: string;
};

export type GroupDrawRuleListen = {
  userId: string;
  albumId: string;
  groupDrawId?: string | null;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
};

export function getActiveFreshMembers<TMember extends GroupDrawRuleMember>(
  members: TMember[],
  listens: GroupDrawRuleListen[],
) {
  const activeUserIds = new Set(
    listens
      .filter((listen) => listen.kind === "fresh" && listen.status === "listening")
      .map((listen) => listen.userId),
  );

  return members.filter((member) => activeUserIds.has(member.id));
}

export function getActiveGroupDrawMembers<TMember extends GroupDrawRuleMember>(
  members: TMember[],
  listens: GroupDrawRuleListen[],
  groupDrawId: string | null,
) {
  if (!groupDrawId) {
    return [];
  }

  return getActiveFreshMembers(
    members,
    listens.filter((listen) => listen.groupDrawId === groupDrawId),
  );
}

export function getGroupDrawablePool<TAlbum extends GroupDrawRuleAlbum>(
  albums: TAlbum[],
  listens: GroupDrawRuleListen[],
) {
  const loggedAlbumIds = new Set(listens.map((listen) => listen.albumId));
  return albums.filter((album) => !loggedAlbumIds.has(album.id));
}

export function assertGroupCanDraw<TMember extends GroupDrawRuleMember>({
  activeMembers,
  blockedMembers,
  poolSize,
}: {
  activeMembers: TMember[];
  blockedMembers: TMember[];
  poolSize: number;
}) {
  if (activeMembers.length === 0) {
    throw new GroupDrawRuleError("This group does not have any active members.");
  }

  if (blockedMembers.length > 0) {
    throw new GroupDrawRuleError(
      `Group draw is blocked until ${formatMemberList(blockedMembers)} ${blockedMembers.length === 1 ? "reviews" : "review"} the active pick.`,
    );
  }

  if (poolSize === 0) {
    throw new GroupDrawRuleError("This group has no shared albums left to draw.");
  }
}

export function formatMemberList(members: GroupDrawRuleMember[]) {
  const names = members.map((member) => member.displayName).filter(Boolean);

  if (names.length === 0) {
    return "the group";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
