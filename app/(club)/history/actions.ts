"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import { getAuthenticatedPocketBase } from "@/lib/auth";

const REPLY_LIMIT = {
  limit: 80,
  windowMs: 10 * 60 * 1000,
};
const MAX_REPLY_BODY = 280;

export type ReviewReplyActionResult = {
  status: "success" | "error";
  message: string;
};

export async function createReviewReplyAction({
  listenId,
  body,
}: {
  listenId: string;
  body: string;
}): Promise<ReviewReplyActionResult> {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit("review:reply", user.id, REPLY_LIMIT);

    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    const cleanListenId = listenId.trim();
    const cleanBody = body.trim().slice(0, MAX_REPLY_BODY);

    if (!cleanListenId) {
      throw new Error("Missing review.");
    }

    if (!cleanBody) {
      throw new Error("Write a reply first.");
    }

    const listen = await pb.collection("listens").getOne(cleanListenId, {
      requestKey: null,
    });

    await pb.collection("review_replies").create(
      {
        listen: cleanListenId,
        user: user.id,
        body: cleanBody,
      },
      { requestKey: null },
    );

    revalidateReviewPaths(asString(listen.album));

    return {
      status: "success",
      message: "Reply added.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add that reply.",
    };
  }
}

export async function deleteReviewReplyAction({
  replyId,
}: {
  replyId: string;
}): Promise<ReviewReplyActionResult> {
  try {
    const { pb } = await getAuthenticatedPocketBase();
    const cleanReplyId = replyId.trim();

    if (!cleanReplyId) {
      throw new Error("Missing reply.");
    }

    const reply = await pb.collection("review_replies").getOne(cleanReplyId, {
      requestKey: null,
    });
    const listenId = asString(reply.listen);
    const listen = listenId
      ? await pb.collection("listens").getOne(listenId, { requestKey: null })
      : null;

    await pb.collection("review_replies").delete(cleanReplyId, {
      requestKey: null,
    });

    revalidateReviewPaths(listen ? asString(listen.album) : null);

    return {
      status: "success",
      message: "Reply deleted.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not delete that reply.",
    };
  }
}

function revalidateReviewPaths(albumId: string | null) {
  revalidatePath("/history");

  if (albumId) {
    revalidatePath(`/albums/${albumId}`);
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
