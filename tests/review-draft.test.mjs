import assert from "node:assert/strict"
import test from "node:test"

import {
  getReviewDraftKey,
  parseReviewDraft,
  REVIEW_DRAFT_MAX_AGE_MS,
  serializeReviewDraft,
} from "../lib/review-draft.ts"

test("review drafts round-trip rating and long review text", () => {
  const now = Date.now()
  const take = "A long review\n\nwith *formatting* and 🎧."

  assert.deepEqual(parseReviewDraft(serializeReviewDraft("9.4", take, now), now), {
    rating: "9.4",
    take,
    updatedAt: now,
  })
  assert.equal(getReviewDraftKey("listen:abc"), "spin500:review-draft:listen:abc")
})

test("invalid and stale review drafts are ignored", () => {
  const now = Date.now()
  const stale = serializeReviewDraft("8", "old", now - REVIEW_DRAFT_MAX_AGE_MS - 1)

  assert.equal(parseReviewDraft(stale, now), null)
  assert.equal(parseReviewDraft("not json", now), null)
  assert.equal(parseReviewDraft(JSON.stringify({ take: "missing fields" }), now), null)
})
