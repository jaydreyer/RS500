export type RatingScale = {
  min: number;
  max: number;
  precision?: number;
  step?: number;
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
  const rawValue = typeof value === "string" ? value.trim() : "";
  const precision = ratingScale.precision ?? getPrecisionFromStep(ratingScale.step ?? 1);
  const decimalPattern =
    precision > 0
      ? new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`)
      : /^\d+$/;

  if (!decimalPattern.test(rawValue)) {
    throw new DrawRuleError(
      `Choose a rating from ${ratingScale.min} to ${ratingScale.max}, with up to ${precision} decimal place.`,
    );
  }

  const rating = Number(rawValue);

  if (!Number.isFinite(rating) || rating < ratingScale.min || rating > ratingScale.max) {
    throw new DrawRuleError(
      `Choose a rating from ${ratingScale.min} to ${ratingScale.max}, with up to ${precision} decimal place.`,
    );
  }

  return Number(rating.toFixed(precision));
}

export function normalizeTake(value: string) {
  return value.trim().slice(0, 180);
}

function getPrecisionFromStep(step: number) {
  const [, decimals = ""] = String(step).split(".");
  return decimals.length;
}
