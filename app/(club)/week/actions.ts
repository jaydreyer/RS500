"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  GroupDrawActionState,
  WeekActionState,
} from "@/app/(club)/week/action-state";
import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import { createSuperuserPocketBase, getAuthenticatedPocketBase } from "@/lib/auth";
import { formatRating, RATING_SCALE } from "@/lib/config";
import {
  DrawRuleError,
  drawAlbum,
  keepFreshPick,
  parseListenId,
  parseRating,
  parseTake,
  rateDrawnSkip,
  rateFreshPick,
  replaceUnavailablePick,
} from "@/lib/draw";
import {
  drawForGroup,
  getUserGroupDrawState,
  GroupDrawRuleError,
  parseGroupId,
} from "@/lib/group-draw";

const REVIEW_WRITE_RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

export async function drawAction(
  previousState: WeekActionState,
  formData: FormData,
): Promise<WeekActionState> {
  void previousState;
  void formData;

  try {
    const { user } = await getAuthenticatedPocketBase();
    const groupDrawState = await getUserGroupDrawState(user.id);
    if (groupDrawState.groups.length > 0) {
      return {
        status: "error",
        message: "Solo draws are paused while you are in an active group.",
        listen: null,
      };
    }

    const adminPb = await createSuperuserPocketBase();
    const listen = await drawAlbum(adminPb, user.id);
    revalidatePath("/week");
    revalidatePath("/stats");

    return {
      status: "success",
      message: `You drew ${listen.album.title}.`,
      listen,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function keepFreshPickAction(
  _previousState: WeekActionState,
  formData: FormData,
): Promise<WeekActionState> {
  try {
    const listenId = parseListenId(formData.get("listenId"));
    const { user } = await getAuthenticatedPocketBase();
    const adminPb = await createSuperuserPocketBase();
    const listen = await keepFreshPick(adminPb, user.id, listenId);
    revalidatePath("/week");

    return {
      status: "success",
      message: `${listen.album.title} is yours.`,
      listen,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function skipRatingAction(
  _previousState: WeekActionState,
  formData: FormData,
): Promise<WeekActionState> {
  try {
    const listenId = parseListenId(formData.get("listenId"));
    const rating = parseRating(formData.get("rating"));
    const take = parseTake(formData.get("take"));
    const { user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit(
      "review:write",
      user.id,
      REVIEW_WRITE_RATE_LIMIT,
    );
    if (rateLimitError) {
      return {
        status: "error",
        message: rateLimitError,
        listen: null,
      };
    }

    const listen = await rateDrawnSkip({
      pb: await createSuperuserPocketBase(),
      userId: user.id,
      listenId,
      rating,
      take,
    });
    revalidatePath("/week");
    revalidatePath("/stats");

    return {
      status: "success",
      message: `Skipped and logged: ${listen.album.title} - ${formatRating(rating)}/${RATING_SCALE.max}.`,
      listen,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function replaceUnavailablePickAction(
  _previousState: WeekActionState,
  formData: FormData,
): Promise<WeekActionState> {
  try {
    const listenId = parseListenId(formData.get("listenId"));
    const { user } = await getAuthenticatedPocketBase();
    const adminPb = await createSuperuserPocketBase();
    const listen = await replaceUnavailablePick({
      pb: adminPb,
      userId: user.id,
      listenId,
    });
    revalidatePath("/week");
    revalidatePath("/catalog");
    revalidatePath("/history");
    revalidatePath("/stats");

    return {
      status: "success",
      message: `Logged unavailable on Spotify. Your replacement is ${listen.album.title}.`,
      listen,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function freshRatingAction(
  _previousState: WeekActionState,
  formData: FormData,
): Promise<WeekActionState> {
  try {
    const listenId = parseListenId(formData.get("listenId"));
    const rating = parseRating(formData.get("rating"));
    const take = parseTake(formData.get("take"));
    const { user } = await getAuthenticatedPocketBase();
    const rateLimitError = consumeUserActionLimit(
      "review:write",
      user.id,
      REVIEW_WRITE_RATE_LIMIT,
    );
    if (rateLimitError) {
      return {
        status: "error",
        message: rateLimitError,
        listen: null,
      };
    }

    const listen = await rateFreshPick({
      pb: await createSuperuserPocketBase(),
      userId: user.id,
      listenId,
      rating,
      take,
    });
    revalidatePath("/week");
    revalidatePath("/stats");

    return {
      status: "success",
      message: `Rated ${listen.album.title} - ${formatRating(rating)}/${RATING_SCALE.max}. Your next draw is unlocked.`,
      listen,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function groupDrawAction(
  _previousState: GroupDrawActionState,
  formData: FormData,
): Promise<GroupDrawActionState> {
  try {
    const groupId = parseGroupId(formData.get("groupId"));
    const { user } = await getAuthenticatedPocketBase();
    const result = await drawForGroup({
      userId: user.id,
      groupId,
    });

    revalidatePath("/week");
    revalidatePath("/board");
    revalidatePath("/history");
    revalidatePath("/stats");

    return {
      status: "success",
      message: `${result.group.name} drew ${result.draw.album.title} for ${result.members.length} members.`,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    return {
      status: "error",
      message:
        error instanceof GroupDrawRuleError
          ? error.message
          : "Something went sideways while spinning for the group.",
    };
  }
}

function handleActionError(error: unknown): WeekActionState {
  if (error instanceof Error && error.message === "Unauthorized.") {
    redirect("/auth");
  }

  return {
    status: "error",
    message:
      error instanceof DrawRuleError
        ? error.message
        : "Something went sideways while saving that pick.",
    listen: null,
  };
}
