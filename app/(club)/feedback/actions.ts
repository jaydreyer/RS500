"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import { createSuperuserPocketBase, getAuthenticatedPocketBase } from "@/lib/auth";
import {
  normalizeFeedbackText,
  parseFeedbackKind,
} from "@/lib/feedback-rules";

const FEEDBACK_LIMIT = {
  limit: 12,
  windowMs: 60 * 60 * 1000,
};

const FEEDBACK_REPLY_LIMIT = {
  limit: 40,
  windowMs: 60 * 60 * 1000,
};

const MAX_SCREENSHOT_SIZE = 8 * 1024 * 1024;
const SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type FeedbackActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function createFeedbackAction(
  _previousState: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit("feedback:create", user.id, FEEDBACK_LIMIT);

    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    const kind = parseFeedbackKind(formData.get("kind"));
    const title = normalizeFeedbackText(formData.get("title"), {
      label: "Title",
      min: 4,
      max: 120,
    });
    const body = normalizeFeedbackText(formData.get("body"), {
      label: "Description",
      min: 10,
      max: 4000,
    });
    const pageContext = normalizeFeedbackText(formData.get("pageContext"), {
      label: "Page context",
      max: 500,
      optional: true,
    });
    const screenshot = parseOptionalScreenshot(formData.get("screenshot"));
    const payload = new FormData();
    payload.set("user", user.id);
    payload.set("kind", kind);
    payload.set("title", title);
    payload.set("body", body);
    payload.set("status", "received");
    payload.set("page_context", pageContext);

    if (screenshot) {
      payload.set("screenshot", screenshot);
    }

    await pb.collection("feedback_submissions").create(payload, {
      requestKey: null,
    });

    revalidateFeedbackPaths();

    return {
      status: "success",
      message: "Thanks — your feedback is in the inbox.",
    };
  } catch (error) {
    return handleActionError(error, "We could not send your feedback.");
  }
}

export async function replyToFeedbackAction(
  _previousState: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit(
      "feedback:reply",
      user.id,
      FEEDBACK_REPLY_LIMIT,
    );

    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    const submissionId = parseId(formData.get("submissionId"), "Missing feedback item.");
    const body = normalizeFeedbackText(formData.get("body"), {
      label: "Reply",
      min: 2,
      max: 2000,
    });

    await pb.collection("feedback_submissions").getOne(submissionId, {
      requestKey: null,
    });
    await pb.collection("feedback_messages").create(
      {
        submission: submissionId,
        author: user.id,
        from_admin: false,
        body,
      },
      { requestKey: null },
    );

    revalidateFeedbackPaths();

    return {
      status: "success",
      message: "Reply sent.",
    };
  } catch (error) {
    return handleActionError(error, "We could not send your reply.");
  }
}

export async function toggleIdeaSupportAction(formData: FormData) {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit(
      "feedback:support",
      user.id,
      FEEDBACK_REPLY_LIMIT,
    );

    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    const ideaId = parseId(formData.get("ideaId"), "Missing idea.");
    await pb.collection("feedback_ideas").getOne(ideaId, {
      requestKey: null,
    });

    const existing = await findSupport(pb, ideaId, user.id);

    if (existing) {
      await pb.collection("feedback_idea_support").delete(existing.id, {
        requestKey: null,
      });
    } else {
      await pb.collection("feedback_idea_support").create(
        {
          idea: ideaId,
          user: user.id,
          reason: "",
        },
        { requestKey: null },
      );
    }

    await refreshIdeaSupportCount(ideaId);
    revalidateFeedbackPaths();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }
}

export async function saveIdeaSupportReasonAction(
  _previousState: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const ideaId = parseId(formData.get("ideaId"), "Missing idea.");
    const reason = normalizeFeedbackText(formData.get("reason"), {
      label: "Use case",
      min: 4,
      max: 1000,
    });
    const existing = await findSupport(pb, ideaId, user.id);

    if (!existing) {
      throw new Error("Choose “I want this too” before adding your use case.");
    }

    await pb.collection("feedback_idea_support").update(
      existing.id,
      { reason },
      { requestKey: null },
    );
    revalidateFeedbackPaths();

    return {
      status: "success",
      message: "Your use case was saved.",
    };
  } catch (error) {
    return handleActionError(error, "We could not save your use case.");
  }
}

async function findSupport(
  pb: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>["pb"],
  ideaId: string,
  userId: string,
) {
  try {
    return await pb.collection("feedback_idea_support").getFirstListItem(
      pb.filter("idea = {:idea} && user = {:user}", {
        idea: ideaId,
        user: userId,
      }),
      { requestKey: null },
    );
  } catch {
    return null;
  }
}

async function refreshIdeaSupportCount(ideaId: string) {
  const pb = await createSuperuserPocketBase();
  const result = await pb.collection("feedback_idea_support").getList(1, 1, {
    filter: pb.filter("idea = {:idea}", { idea: ideaId }),
    requestKey: null,
  });

  await pb.collection("feedback_ideas").update(
    ideaId,
    { support_count: result.totalItems },
    { requestKey: null },
  );
}

function parseOptionalScreenshot(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  if (!SCREENSHOT_TYPES.has(value.type)) {
    throw new Error("Screenshots must be JPG, PNG, or WebP.");
  }

  if (value.size > MAX_SCREENSHOT_SIZE) {
    throw new Error("Screenshots must be 8 MB or smaller.");
  }

  return value;
}

function parseId(value: unknown, errorMessage: string) {
  const id = asString(value);
  if (!/^[A-Za-z0-9_-]{10,32}$/.test(id)) {
    throw new Error(errorMessage);
  }

  return id;
}

function revalidateFeedbackPaths() {
  revalidatePath("/feedback");
  revalidatePath("/feedback/admin");
}

function handleActionError(error: unknown, fallback: string): FeedbackActionState {
  if (error instanceof Error && error.message === "Unauthorized.") {
    redirect("/auth");
  }

  return {
    status: "error",
    message: error instanceof Error ? error.message : fallback,
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
