import type PocketBase from "pocketbase";

type RecordLike = {
  id: string;
  [key: string]: unknown;
};

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
    } else {
      await pb.collection("feed_reads").create(
        {
          user: userId,
          last_read_at: lastReadAt,
        },
        { requestKey: null },
      );
    }
  } catch {
    // Keep mention read state independent from the legacy feed read marker.
  }

  await markFeedMentionsRead(pb, userId, lastReadAt);
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

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
