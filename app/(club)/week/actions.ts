"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { WeekActionState } from "@/app/(club)/week/action-state";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import {
  DrawRuleError,
  drawAlbum,
  keepFreshPick,
  parseListenId,
  parseRating,
  parseTake,
  rateDrawnSkip,
  rateFreshPick,
} from "@/lib/draw";

export async function drawAction(
  previousState: WeekActionState,
  formData: FormData,
): Promise<WeekActionState> {
  void previousState;
  void formData;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const listen = await drawAlbum(pb, user.id);
    revalidatePath("/week");

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
    const { pb, user } = await getAuthenticatedPocketBase();
    const listen = await keepFreshPick(pb, user.id, listenId);
    revalidatePath("/week");

    return {
      status: "success",
      message: `${listen.album.title} is yours for the week.`,
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
    const { pb, user } = await getAuthenticatedPocketBase();
    const listen = await rateDrawnSkip({
      pb,
      userId: user.id,
      listenId,
      rating,
      take,
    });
    revalidatePath("/week");

    return {
      status: "success",
      message: `Skipped and logged: ${listen.album.title} - ${rating}/10.`,
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
    const { pb, user } = await getAuthenticatedPocketBase();
    const listen = await rateFreshPick({
      pb,
      userId: user.id,
      listenId,
      rating,
      take,
    });
    revalidatePath("/week");

    return {
      status: "success",
      message: `Rated ${listen.album.title} - ${rating}/10. Your next draw is unlocked.`,
      listen,
    };
  } catch (error) {
    return handleActionError(error);
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
