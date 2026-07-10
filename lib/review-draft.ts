export const REVIEW_DRAFT_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

export type ReviewDraft = {
  rating: string;
  take: string;
  updatedAt: number;
};

export function getReviewDraftKey(id: string) {
  return `spin500:review-draft:${id}`;
}

export function serializeReviewDraft(rating: string, take: string, now = Date.now()) {
  return JSON.stringify({ rating, take, updatedAt: now } satisfies ReviewDraft);
}

export function parseReviewDraft(value: string | null, now = Date.now()): ReviewDraft | null {
  if (!value) {
    return null;
  }

  try {
    const draft = JSON.parse(value) as Partial<ReviewDraft>;
    if (
      typeof draft.rating !== "string" ||
      typeof draft.take !== "string" ||
      typeof draft.updatedAt !== "number" ||
      now - draft.updatedAt > REVIEW_DRAFT_MAX_AGE_MS
    ) {
      return null;
    }

    return draft as ReviewDraft;
  } catch {
    return null;
  }
}
