export const FEED_POST_MAX_LENGTH = 2_000;

export function normalizeFeedPostBody(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getFeedPostLengthError(body: string) {
  if (body.length <= FEED_POST_MAX_LENGTH) {
    return null;
  }

  return `Feed posts must be ${FEED_POST_MAX_LENGTH.toLocaleString()} characters or less.`;
}
