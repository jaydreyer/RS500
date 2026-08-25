import assert from "node:assert/strict";
import test from "node:test";

import {
  FEED_POST_MAX_LENGTH,
  getFeedPostLengthError,
  normalizeFeedPostBody,
} from "../lib/feed-post.ts";

test("feed posts preserve their full submitted body through the limit", () => {
  const body = `  ${"x".repeat(FEED_POST_MAX_LENGTH)}  `;

  assert.equal(normalizeFeedPostBody(body), "x".repeat(FEED_POST_MAX_LENGTH));
  assert.equal(getFeedPostLengthError(normalizeFeedPostBody(body)), null);
});

test("over-limit feed posts are rejected without truncating the body", () => {
  const body = `${"x".repeat(FEED_POST_MAX_LENGTH)} after the limit`;
  const normalized = normalizeFeedPostBody(body);

  assert.equal(normalized, body);
  assert.equal(
    getFeedPostLengthError(normalized),
    `Feed posts must be ${FEED_POST_MAX_LENGTH.toLocaleString()} characters or less.`,
  );
});

test("counts spaces and line breaks toward the feed post limit", () => {
  const body = `${"x".repeat(FEED_POST_MAX_LENGTH - 2)}\n `;

  assert.equal(getFeedPostLengthError(body), null);
  assert.notEqual(getFeedPostLengthError(`${body}x`), null);
});
