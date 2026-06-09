"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { formatRating, RATING_SCALE } from "@/lib/config";
import {
  DrawRuleError,
  parseAlbumId,
  parseRating,
  parseTake,
  rateKnownAlbum,
} from "@/lib/draw";

const REVIEW_WRITE_RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

type AlbumRatingActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function knownAlbumRatingAction(
  _previousState: AlbumRatingActionState,
  formData: FormData,
): Promise<AlbumRatingActionState> {
  try {
    const albumId = parseAlbumId(formData.get("albumId"));
    const rating = parseRating(formData.get("rating"));
    const take = parseTake(formData.get("take"));
    const { pb, user } = await getAuthenticatedPocketBase();
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
      pb,
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
