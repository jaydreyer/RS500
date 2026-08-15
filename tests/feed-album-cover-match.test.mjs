import assert from "node:assert/strict";
import test from "node:test";

import { filesHaveMatchingContents } from "../lib/feed-album-cover-match.ts";

test("recognizes an uploaded copy of an album cover despite distinct filenames", async () => {
  const albumCover = new Blob(["same artwork"], { type: "image/jpeg" });
  const uploadedPostImage = new Blob(["same artwork"], { type: "image/jpeg" });

  assert.equal(await filesHaveMatchingContents(uploadedPostImage, albumCover), true);
});

test("keeps a post image when its contents differ from the album cover", async () => {
  const albumCover = new Blob(["album artwork"], { type: "image/jpeg" });
  const postImage = new Blob(["concert photo"], { type: "image/jpeg" });

  assert.equal(await filesHaveMatchingContents(postImage, albumCover), false);
});
