export type RatingScale = {
  min: number;
  max: number;
};

export type DrawRuleListen = {
  kind: "fresh" | "skip";
  status: "listening" | "rated";
};

export class DrawRuleError extends Error {}

export function assertActiveFreshListen(listen: DrawRuleListen) {
  if (listen.kind !== "fresh" || listen.status !== "listening") {
    throw new DrawRuleError("That pick is not waiting for a rating.");
  }
}

export function getDrawablePool<TAlbum extends { id: string }>(
  albums: TAlbum[],
  loggedAlbumIds: Set<string>,
) {
  return albums.filter((album) => !loggedAlbumIds.has(album.id));
}

export function parseRatingValue(value: FormDataEntryValue | null, ratingScale: RatingScale) {
  const rating = typeof value === "string" ? Number(value) : NaN;

  if (
    !Number.isInteger(rating) ||
    rating < ratingScale.min ||
    rating > ratingScale.max
  ) {
    throw new DrawRuleError(`Choose a rating from ${ratingScale.min} to ${ratingScale.max}.`);
  }

  return rating;
}

export function normalizeTake(value: string) {
  return value.trim().slice(0, 180);
}
