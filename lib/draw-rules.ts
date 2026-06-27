export type RatingScale = {
  min: number;
  max: number;
  precision?: number;
  step?: number;
};

export type DrawRuleListen = {
  groupDrawId?: string | null;
  kind: "fresh" | "skip";
  status: "listening" | "rated";
};

export class DrawRuleError extends Error {}

export const TAKE_MAX_LENGTH = 2000;
export const SOLO_DRAW_GROUP_BLOCKED_MESSAGE =
  "Solo draws are paused while you are in an active group.";

export function assertActiveFreshListen(listen: DrawRuleListen) {
  if (listen.kind !== "fresh" || listen.status !== "listening") {
    throw new DrawRuleError("That pick is not waiting for a rating.");
  }
}

export function assertIndividualFreshListen(listen: DrawRuleListen) {
  assertActiveFreshListen(listen);

  if (listen.groupDrawId) {
    throw new DrawRuleError("Group picks should be reviewed as group picks.");
  }
}

export function assertSoloDrawAllowed(activeGroupCount: number) {
  if (activeGroupCount > 0) {
    throw new DrawRuleError(SOLO_DRAW_GROUP_BLOCKED_MESSAGE);
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
      ? new RegExp(`^(?:\\d+(?:\\.\\d{1,${precision}})?|\\.\\d{1,${precision}})$`)
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
  return [...value.trim()].slice(0, TAKE_MAX_LENGTH).join("");
}

function getPrecisionFromStep(step: number) {
  const [, decimals = ""] = String(step).split(".");
  return decimals.length;
}
