import "server-only";

import type PocketBase from "pocketbase";

import {
  getClubUserAvatarUrl,
  getClubUserDisplayName,
  getClubUserInitials,
  getPocketBaseUrl,
  type ClubUser,
} from "@/lib/auth";
import {
  getPreferredMentionHandle,
  type MentionUserRecord,
} from "@/lib/feed-mentions";

export type FeedMember = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
};

export type FeedMentionMember = FeedMember & {
  mentionHandle: string;
};

export type FeedAlbum = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
};

export type FeedReaction = {
  id: string;
  postId: string;
  userId: string;
  emoji: string;
  created: string;
  user: FeedMember;
};

export type FeedReply = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  created: string;
  user: FeedMember;
};

export type FeedPost = {
  id: string;
  userId: string;
  albumId: string | null;
  body: string;
  imageUrl: string | null;
  created: string;
  updated: string;
  user: FeedMember;
  album: FeedAlbum | null;
  replies: FeedReply[];
  reactions: FeedReaction[];
};

export type FeedCurrentListen = {
  id: string;
  albumId: string;
  week: string;
  created: string;
  album: FeedAlbum;
};

export type FeedState = {
  currentUser: ClubUser;
  members: FeedMentionMember[];
  albums: FeedAlbum[];
  currentListens: FeedCurrentListen[];
  posts: FeedPost[];
};

type RecordLike = {
  id: string;
  created?: string;
  updated?: string;
  collectionName?: string;
  collectionId?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getFeedState(
  pb: PocketBase,
  currentUser: ClubUser,
): Promise<FeedState> {
  const [albums, currentListens, postsPage, users] = await Promise.all([
    pb.collection("albums").getFullList({
      sort: "rank",
      requestKey: null,
    }),
    pb.collection("listens").getFullList({
      filter: pb.filter('user = {:user} && status = "listening"', {
        user: currentUser.id,
      }),
      expand: "album",
      sort: "-created",
      requestKey: null,
    }),
    pb.collection("feed_posts").getList(1, 60, {
      expand: "user,album",
      sort: "-created",
      requestKey: null,
    }),
    pb.collection("users").getFullList<MentionUserRecord>({
      sort: "display_name,email",
      requestKey: null,
    }),
  ]);

  return {
    currentUser,
    members: mapMentionMembers(users, currentUser.id),
    albums: albums.map((album) => mapAlbum(album)),
    currentListens: currentListens.map((listen) => mapCurrentListen(listen)),
    posts: await hydratePosts(pb, postsPage.items),
  };
}

export async function getFeedUnreadCount(pb: PocketBase, userId: string) {
  const unreadMentions = await getFeedUnreadMentions(pb, userId);
  const mentionedPostIds = new Set(
    unreadMentions.map((mention) => asString(mention.post)).filter(Boolean),
  );
  const postUnreadCount = await getFeedPostUnreadCount(pb, userId, mentionedPostIds);

  return postUnreadCount + unreadMentions.length;
}

async function getFeedPostUnreadCount(
  pb: PocketBase,
  userId: string,
  excludedPostIds = new Set<string>(),
) {
  const readState = await getFeedReadState(pb, userId);
  if (!readState.available) {
    return 0;
  }

  const filter = readState.lastReadAt
    ? pb.filter("created > {:lastReadAt} && user != {:user}", {
        lastReadAt: readState.lastReadAt,
        user: userId,
      })
    : pb.filter("user != {:user}", { user: userId });

  try {
    const posts = await pb.collection("feed_posts").getFullList({
      filter,
      requestKey: null,
    });

    return posts.filter((post) => !excludedPostIds.has(post.id)).length;
  } catch {
    return 0;
  }
}

async function getFeedUnreadMentions(pb: PocketBase, userId: string) {
  try {
    const mentions = await pb.collection("feed_mentions").getFullList({
      filter: pb.filter("user = {:user}", { user: userId }),
      requestKey: null,
    });

    return mentions.filter((mention) => !asString(mention.read_at));
  } catch {
    return [];
  }
}

export async function markFeedRead(
  pb: PocketBase,
  userId: string,
  lastReadAt = new Date().toISOString(),
) {
  try {
    const existing = await getFeedReadRecord(pb, userId);

    if (existing) {
      await pb.collection("feed_reads").update(
        existing.id,
        { last_read_at: lastReadAt },
        { requestKey: null },
      );
      return;
    }

    await pb.collection("feed_reads").create(
      {
        user: userId,
        last_read_at: lastReadAt,
      },
      { requestKey: null },
    );
  } catch {
    // Keep mention read state independent from the legacy feed read marker.
  }

  await markFeedMentionsRead(pb, userId, lastReadAt);
}

export async function getAlbumFeedPosts({
  pb,
  albumId,
  limit = 4,
}: {
  pb: PocketBase;
  albumId: string;
  limit?: number;
}) {
  const postsPage = await pb.collection("feed_posts").getList(1, limit, {
    filter: pb.filter("album = {:album}", { album: albumId }),
    expand: "user,album",
    sort: "-created",
    requestKey: null,
  });

  return hydratePosts(pb, postsPage.items);
}

async function getFeedReadState(pb: PocketBase, userId: string) {
  try {
    const page = await pb.collection("feed_reads").getList(1, 1, {
      filter: pb.filter("user = {:user}", { user: userId }),
      requestKey: null,
    });

    return {
      available: true,
      lastReadAt: page.items[0] ? asString(page.items[0].last_read_at) : "",
    };
  } catch {
    return {
      available: false,
      lastReadAt: "",
    };
  }
}

async function getFeedReadRecord(pb: PocketBase, userId: string): Promise<RecordLike | null> {
  try {
    return await pb.collection("feed_reads").getFirstListItem(
      pb.filter("user = {:user}", { user: userId }),
      { requestKey: null },
    );
  } catch {
    return null;
  }
}

async function markFeedMentionsRead(
  pb: PocketBase,
  userId: string,
  readAt: string,
) {
  try {
    const mentions = await pb.collection("feed_mentions").getFullList({
      filter: pb.filter("user = {:user}", { user: userId }),
      requestKey: null,
    });
    const unreadMentions = mentions.filter((mention) => !asString(mention.read_at));

    await Promise.all(
      unreadMentions.map((mention) =>
        pb.collection("feed_mentions").update(
          mention.id,
          { read_at: readAt },
          { requestKey: null },
        ),
      ),
    );
  } catch {
    return;
  }
}

async function hydratePosts(pb: PocketBase, records: RecordLike[]) {
  const posts = records.map((record) => mapPost(record));
  const postIds = posts.map((post) => post.id);
  const [replies, reactions] = await Promise.all([
    getRepliesForPosts(pb, postIds),
    getReactionsForPosts(pb, postIds),
  ]);

  return posts.map((post) => ({
    ...post,
    replies: replies.filter((reply) => reply.postId === post.id),
    reactions: reactions.filter((reaction) => reaction.postId === post.id),
  }));
}

async function getRepliesForPosts(pb: PocketBase, postIds: string[]) {
  if (postIds.length === 0) {
    return [];
  }

  const params = Object.fromEntries(postIds.map((id, index) => [`post${index}`, id]));
  const filter = postIds.map((_, index) => `post = {:post${index}}`).join(" || ");
  const replies = await pb.collection("feed_replies").getFullList({
    filter: pb.filter(filter, params),
    expand: "user",
    sort: "created",
    requestKey: null,
  });

  return replies.map((reply) => mapReply(reply));
}

async function getReactionsForPosts(pb: PocketBase, postIds: string[]) {
  if (postIds.length === 0) {
    return [];
  }

  const params = Object.fromEntries(postIds.map((id, index) => [`post${index}`, id]));
  const filter = postIds.map((_, index) => `post = {:post${index}}`).join(" || ");
  const reactions = await pb.collection("feed_reactions").getFullList({
    filter: pb.filter(filter, params),
    expand: "user",
    sort: "created",
    requestKey: null,
  });

  return reactions.map((reaction) => mapReaction(reaction));
}

function mapPost(record: RecordLike): FeedPost {
  const albumRecord = getExpandedRecord(record, "album", { optional: true });

  return {
    id: record.id,
    userId: asString(record.user),
    albumId: asNullableString(record.album),
    body: asString(record.body),
    imageUrl: getFileUrl(record, "image", "960x0"),
    created: asString(record.created),
    updated: asString(record.updated),
    user: mapMember(getExpandedRecord(record, "user")),
    album: albumRecord ? mapAlbum(albumRecord) : null,
    replies: [],
    reactions: [],
  };
}

function mapReply(record: RecordLike): FeedReply {
  return {
    id: record.id,
    postId: asString(record.post),
    userId: asString(record.user),
    body: asString(record.body),
    created: asString(record.created),
    user: mapMember(getExpandedRecord(record, "user")),
  };
}

function mapReaction(record: RecordLike): FeedReaction {
  return {
    id: record.id,
    postId: asString(record.post),
    userId: asString(record.user),
    emoji: asString(record.emoji),
    created: asString(record.created),
    user: mapMember(getExpandedRecord(record, "user")),
  };
}

function mapCurrentListen(record: RecordLike): FeedCurrentListen {
  return {
    id: record.id,
    albumId: asString(record.album),
    week: asString(record.week),
    created: asString(record.created),
    album: mapAlbum(getExpandedRecord(record, "album")),
  };
}

function mapAlbum(record: RecordLike): FeedAlbum {
  return {
    id: record.id,
    rank: asNumber(record.rank),
    title: asString(record.title),
    artist: asString(record.artist),
    year: asNumber(record.year),
    coverUrl: asString(record.cover_url),
  };
}

function mapMember(record: RecordLike): FeedMember {
  const displayName = getClubUserDisplayName(record);

  return {
    id: record.id,
    displayName,
    initials: getClubUserInitials(record),
    avatarUrl: getClubUserAvatarUrl(record),
  };
}

function mapMentionMembers(
  records: MentionUserRecord[],
  currentUserId: string,
): FeedMentionMember[] {
  return records
    .filter((record) => record.id !== currentUserId && !asString(record.deactivated_at))
    .map((record) => ({
      ...mapMember(record),
      mentionHandle: getPreferredMentionHandle(record, records, currentUserId),
    }))
    .filter((member) => member.mentionHandle)
    .sort((first, second) => first.displayName.localeCompare(second.displayName));
}

function getFileUrl(record: RecordLike, field: string, thumb?: string) {
  const filename = asString(record[field]);

  if (!filename) {
    return null;
  }

  const collection = asString(record.collectionName) || asString(record.collectionId);
  const baseUrl = getPocketBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(record.id)}/${encodeURIComponent(filename)}`;

  return thumb ? `${url}?thumb=${encodeURIComponent(thumb)}` : url;
}

function getExpandedRecord(
  record: RecordLike,
  key: string,
  options: { optional?: boolean } = {},
): RecordLike {
  const expanded = record.expand?.[key];
  const value = Array.isArray(expanded) ? expanded[0] : expanded;

  if (!value || typeof value !== "object" || !("id" in value)) {
    if (options.optional) {
      return null as unknown as RecordLike;
    }

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
