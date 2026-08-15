"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { filesHaveMatchingContents } from "@/lib/feed-album-cover-match";
import {
  extractMentionHandles,
  resolveMentionRecipients,
  type MentionUserRecord,
} from "@/lib/feed-mentions";

const POST_LIMIT = {
  limit: 24,
  windowMs: 10 * 60 * 1000,
};

const INLINE_LIMIT = {
  limit: 80,
  windowMs: 10 * 60 * 1000,
};

const MAX_POST_BODY = 560;
const MAX_REPLY_BODY = 280;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const QUICK_REACTIONS = new Set(["heart", "fire", "100", "wow", "needle"]);
const MAX_REACTION_LENGTH = 24;

export type FeedPostActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function createFeedPostAction(
  _previousState: FeedPostActionState,
  formData: FormData,
): Promise<FeedPostActionState> {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit("feed:post", user.id, POST_LIMIT);

    if (rateLimitError) {
      return {
        status: "error",
        message: rateLimitError,
      };
    }

    const body = parseBody(formData.get("body"), MAX_POST_BODY);
    const albumId = parseOptionalId(formData.get("albumId"));
    const image = parseOptionalImage(formData.get("image"));

    if (!body && !image) {
      return {
        status: "error",
        message: "Write something or add a picture before posting.",
      };
    }

    const payload = new FormData();
    payload.set("user", user.id);
    payload.set("body", body);

    if (albumId) {
      payload.set("album", albumId);
    }

    if (image) {
      payload.set("image", image);
    }

    const albumCoverCheck = await checkUploadedAlbumCover({ albumId, image, pb });

    if (albumCoverCheck.checked) {
      payload.set("image_is_album_cover", String(Boolean(albumCoverCheck.coverImage)));
    }

    if (albumCoverCheck.coverImage) {
      payload.set("album_cover_image", albumCoverCheck.coverImage);
    }

    const post = await pb.collection("feed_posts").create(payload, {
      requestKey: null,
    });

    await createFeedMentions({
      pb,
      actorUserId: user.id,
      postId: post.id,
      body,
    });

    revalidatePath("/feed");
    if (albumId) {
      revalidatePath(`/albums/${albumId}`);
    }

    return {
      status: "success",
      message: post.id ? "Posted to The Feed." : "Posted.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not post to The Feed.",
    };
  }
}

export async function createFeedReplyAction(formData: FormData) {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit("feed:reply", user.id, INLINE_LIMIT);

    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    const postId = parseRequiredId(formData.get("postId"), "Missing post.");
    const body = parseBody(formData.get("body"), MAX_REPLY_BODY);

    if (!body) {
      throw new Error("Write a reply first.");
    }

    const post = await pb.collection("feed_posts").getOne(postId, {
      requestKey: null,
    });

    const reply = await pb.collection("feed_replies").create(
      {
        post: postId,
        user: user.id,
        body,
      },
      { requestKey: null },
    );

    await createFeedMentions({
      pb,
      actorUserId: user.id,
      postId,
      replyId: reply.id,
      body,
    });

    revalidateFeedPaths(asString(post.album));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }
}

export async function toggleFeedReactionAction(formData: FormData) {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit("feed:reaction", user.id, INLINE_LIMIT);

    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    const postId = parseRequiredId(formData.get("postId"), "Missing post.");
    const emoji = parseReaction(formData.get("emoji"));
    const post = await pb.collection("feed_posts").getOne(postId, {
      requestKey: null,
    });
    const existing = await getExistingReaction(pb, postId, user.id, emoji);

    if (existing) {
      await pb.collection("feed_reactions").delete(existing.id, {
        requestKey: null,
      });
    } else {
      await pb.collection("feed_reactions").create(
        {
          post: postId,
          user: user.id,
          emoji,
        },
        { requestKey: null },
      );
    }

    revalidateFeedPaths(asString(post.album));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }
}

export async function deleteFeedPostAction(formData: FormData) {
  try {
    const { pb } = await getAuthenticatedPocketBase();
    const postId = parseRequiredId(formData.get("postId"), "Missing post.");
    const post = await pb.collection("feed_posts").getOne(postId, {
      requestKey: null,
    });

    await pb.collection("feed_posts").delete(postId, {
      requestKey: null,
    });

    revalidateFeedPaths(asString(post.album));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }
}

export async function deleteFeedReplyAction(formData: FormData) {
  try {
    const { pb } = await getAuthenticatedPocketBase();
    const replyId = parseRequiredId(formData.get("replyId"), "Missing reply.");
    const reply = await pb.collection("feed_replies").getOne(replyId, {
      requestKey: null,
    });
    const postId = asString(reply.post);
    const post = postId
      ? await pb.collection("feed_posts").getOne(postId, { requestKey: null })
      : null;

    await pb.collection("feed_replies").delete(replyId, {
      requestKey: null,
    });

    revalidateFeedPaths(post ? asString(post.album) : null);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }
}

async function getExistingReaction(
  pb: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>["pb"],
  postId: string,
  userId: string,
  emoji: string,
) {
  try {
    return await pb.collection("feed_reactions").getFirstListItem(
      pb.filter("post = {:post} && user = {:user} && emoji = {:emoji}", {
        post: postId,
        user: userId,
        emoji,
      }),
      { requestKey: null },
    );
  } catch {
    return null;
  }
}

async function createFeedMentions({
  pb,
  actorUserId,
  postId,
  replyId,
  body,
}: {
  pb: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>["pb"];
  actorUserId: string;
  postId: string;
  replyId?: string;
  body: string;
}) {
  const handles = extractMentionHandles(body);

  if (handles.length === 0) {
    return;
  }

  try {
    const users = await pb.collection("users").getFullList<MentionUserRecord>({
      requestKey: null,
      sort: "display_name,email",
    });
    const recipients = resolveMentionRecipients(users, handles, actorUserId);

    await Promise.all(
      recipients.map((recipient) =>
        pb.collection("feed_mentions").create(
          {
            post: postId,
            ...(replyId ? { reply: replyId } : {}),
            actor: actorUserId,
            user: recipient.id,
          },
          { requestKey: null },
        ),
      ),
    );
  } catch {
    return;
  }
}

function revalidateFeedPaths(albumId: string | null) {
  revalidatePath("/feed");

  if (albumId) {
    revalidatePath(`/albums/${albumId}`);
  }
}

function parseBody(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function parseOptionalId(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseRequiredId(value: FormDataEntryValue | null, message: string) {
  const id = parseOptionalId(value);

  if (!id) {
    throw new Error(message);
  }

  return id;
}

function parseReaction(value: FormDataEntryValue | null) {
  const reaction = parseRequiredId(value, "Missing reaction.");

  if (!QUICK_REACTIONS.has(reaction)) {
    if (!isEmojiReaction(reaction)) {
      throw new Error("That reaction is not available.");
    }
  }

  return reaction;
}

function isEmojiReaction(value: string) {
  return (
    value.length <= MAX_REACTION_LENGTH &&
    !/\s/u.test(value) &&
    !/[\p{L}\p{N}]/u.test(value) &&
    /\p{Extended_Pictographic}/u.test(value)
  );
}

function parseOptionalImage(value: FormDataEntryValue | null) {
  if (!isFileLike(value) || value.size === 0) {
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    throw new Error("Use a JPG, PNG, WEBP, or GIF image.");
  }

  if (value.size > MAX_IMAGE_SIZE) {
    throw new Error("Images need to be 8 MB or smaller.");
  }

  return value;
}

async function checkUploadedAlbumCover({
  albumId,
  image,
  pb,
}: {
  albumId: string;
  image: File | null;
  pb: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>["pb"];
}) {
  if (!albumId || !image) {
    return { checked: false, coverImage: null };
  }

  try {
    const album = await pb.collection("albums").getOne(albumId, {
      fields: "id,collectionId,collectionName,cover_image",
      requestKey: null,
    });
    const coverImage = asString(album.cover_image);

    if (!coverImage) {
      return { checked: true, coverImage: null };
    }

    const response = await fetch(pb.files.getURL(album, coverImage));

    if (!response.ok) {
      return { checked: false, coverImage: null };
    }

    return {
      checked: true,
      coverImage: (await filesHaveMatchingContents(image, await response.blob()))
        ? coverImage
        : null,
    };
  } catch {
    return { checked: false, coverImage: null };
  }
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "type" in value
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
