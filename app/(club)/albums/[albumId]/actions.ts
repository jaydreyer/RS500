"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import { createSuperuserPocketBase, getAuthenticatedPocketBase } from "@/lib/auth";
import { formatRating, RATING_SCALE } from "@/lib/config";
import {
  DrawRuleError,
  parseAlbumId,
  parseListenId,
  parseRating,
  parseTake,
  rateKnownAlbum,
  replaceUnavailablePick,
} from "@/lib/draw";

const REVIEW_WRITE_RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

type AlbumRatingActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type AlbumReplacementActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  replacementAlbumId: string | null;
};

export async function knownAlbumRatingAction(
  _previousState: AlbumRatingActionState,
  formData: FormData,
): Promise<AlbumRatingActionState> {
  try {
    const albumId = parseAlbumId(formData.get("albumId"));
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
      };
    }

    const listen = await rateKnownAlbum({
      pb: await createSuperuserPocketBase(),
      userId: user.id,
      albumId,
      rating,
      take,
    });

    revalidatePath(`/albums/${albumId}`);
    revalidatePath("/catalog");
    revalidatePath("/history");
    revalidatePath("/stats");
    revalidatePath("/week");

    return {
      status: "success",
      message: `Rated ${listen.album.title} - ${formatRating(rating)}/${RATING_SCALE.max}.`,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    return {
      status: "error",
      message:
        error instanceof DrawRuleError
          ? error.message
          : "Something went sideways while saving that rating.",
    };
  }
}

export async function replaceUnavailableAlbumAction(
  _previousState: AlbumReplacementActionState,
  formData: FormData,
): Promise<AlbumReplacementActionState> {
  try {
    const listenId = parseListenId(formData.get("listenId"));
    const albumId = parseAlbumId(formData.get("albumId"));
    const { user } = await getAuthenticatedPocketBase();
    const adminPb = await createSuperuserPocketBase();
    const replacement = await replaceUnavailablePick({
      pb: adminPb,
      userId: user.id,
      listenId,
    });

    revalidatePath(`/albums/${albumId}`);
    revalidatePath(`/albums/${replacement.album.id}`);
    revalidatePath("/catalog");
    revalidatePath("/history");
    revalidatePath("/stats");
    revalidatePath("/week");

    return {
      status: "success",
      message: `Logged unavailable on Spotify. Your replacement is ${replacement.album.title}.`,
      replacementAlbumId: replacement.album.id,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    return {
      status: "error",
      message:
        error instanceof DrawRuleError
          ? error.message
          : "Something went sideways while replacing that pick.",
      replacementAlbumId: null,
    };
  }
}
