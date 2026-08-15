import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowFeedAlbumCard } from "../lib/feed-album-card.ts";

const currentAlbumCoverImage = "cover.jpg";

test("shows an album card when a post has no primary image", () => {
  assert.equal(
    shouldShowFeedAlbumCard({
      albumCoverImage: null,
      currentAlbumCoverImage,
      hasImage: false,
      imageIsAlbumCover: false,
    }),
    true,
  );
});

test("hides the card for a verified primary image that matches the current album cover", () => {
  assert.equal(
    shouldShowFeedAlbumCard({
      albumCoverImage: currentAlbumCoverImage,
      currentAlbumCoverImage,
      hasImage: true,
      imageIsAlbumCover: true,
    }),
    false,
  );
});

test("shows the card after the album cover changes", () => {
  assert.equal(
    shouldShowFeedAlbumCard({
      albumCoverImage: "old-cover.jpg",
      currentAlbumCoverImage,
      hasImage: true,
      imageIsAlbumCover: true,
    }),
    true,
  );
});

test("shows the card for legacy image posts that have not been checked", () => {
  assert.equal(
    shouldShowFeedAlbumCard({
      albumCoverImage: null,
      currentAlbumCoverImage,
      hasImage: true,
      imageIsAlbumCover: false,
    }),
    true,
  );
});
