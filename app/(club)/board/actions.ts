"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedPocketBase } from "@/lib/auth";

export type ReactionActionResult = {
  status: "success" | "error";
  message: string;
};

export async function upsertReactionAction({
  listenId,
  emoji,
  comment,
}: {
  listenId: string;
  emoji: string;
  comment: string;
}): Promise<ReactionActionResult> {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const cleanListenId = listenId.trim();
    const cleanEmoji = emoji.trim().slice(0, 24);
    const cleanComment = comment.trim().slice(0, 180);

    if (!cleanListenId) {
      throw new Error("Missing board item.");
    }

    const listen = await pb.collection("listens").getOne(cleanListenId, {
      requestKey: null,
    });

    const existing = await getExistingReaction(pb, cleanListenId, user.id);
    const payload = {
      listen: cleanListenId,
      user: user.id,
      emoji: cleanEmoji,
      comment: cleanComment,
    };

    if (existing) {
      await pb.collection("reactions").update(existing.id, payload, {
        requestKey: null,
      });
    } else {
      await pb.collection("reactions").create(payload, {
        requestKey: null,
      });
    }

    revalidatePath("/board");
    revalidatePath("/history");
    if (typeof listen.album === "string" && listen.album.trim()) {
      revalidatePath(`/albums/${listen.album.trim()}`);
    }

    return {
      status: "success",
      message: "Reaction saved.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not save that reaction.",
    };
  }
}

async function getExistingReaction(
  pb: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>["pb"],
  listenId: string,
  userId: string,
) {
  try {
    return await pb.collection("reactions").getFirstListItem(
      pb.filter("listen = {:listen} && user = {:user}", {
        listen: listenId,
        user: userId,
      }),
      { requestKey: null },
    );
  } catch {
    return null;
  }
}
