export type GroupDrawMember = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
};

export type GroupDrawAlbum = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
};

export type CurrentGroupDraw = {
  id: string;
  groupId: string;
  albumId: string;
  week: string;
  createdById: string;
  created: string;
  album: GroupDrawAlbum;
};

export type UserGroupDraw = {
  id: string;
  name: string;
  slug: string;
  members: GroupDrawMember[];
  blockedMembers: GroupDrawMember[];
  currentDraw: CurrentGroupDraw | null;
  poolLeft: number;
};

export type UserGroupDrawState = {
  weekKey: string;
  groups: UserGroupDraw[];
};
