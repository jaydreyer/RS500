import assert from "node:assert/strict"
import test from "node:test"

import {
  hasAlbumChanges,
  normalizeAlbum,
  parseReviewLinks,
  summarizeDuplicateTitleArtists,
} from "../scripts/import-albums.mjs"

test("seed importer rejects albums missing required cover art", () => {
  assert.throws(
    () =>
      normalizeAlbum({
        rank: "1",
        title: "What's Going On",
        artist: "Marvin Gaye",
        year: "1971",
      }),
    /cover_url/,
  )
})

test("seed importer treats an unchanged rank as idempotent", () => {
  const album = normalizeAlbum({
    rank: "1",
    title: "What's Going On",
    artist: "Marvin Gaye",
    year: "1971",
    cover_url: "https://example.com/cover.jpg",
    spotify_url: "",
    apple_music_url: "",
  })

  assert.equal(hasAlbumChanges(album, album), false)
  assert.equal(hasAlbumChanges({ ...album, title: "Old Title" }, album), true)
})

test("seed importer accepts review links as JSON", () => {
  const links = parseReviewLinks(
    JSON.stringify([
      {
        source: "AllMusic",
        url: "https://www.allmusic.com/album/example",
        kind: "reference",
      },
    ]),
  )

  assert.deepEqual(links, [
    {
      source: "AllMusic",
      url: "https://www.allmusic.com/album/example",
      kind: "reference",
    },
  ])

  const album = normalizeAlbum({
    rank: "1",
    title: "What's Going On",
    artist: "Marvin Gaye",
    year: "1971",
    cover_url: "https://example.com/cover.jpg",
    review_links: JSON.stringify(links),
  })

  assert.deepEqual(album.review_links, links)
})

test("seed importer rejects malformed review links", () => {
  assert.throws(
    () => parseReviewLinks(JSON.stringify([{ source: "", url: "https://example.com" }])),
    /source/,
  )
  assert.throws(
    () => parseReviewLinks(JSON.stringify([{ source: "Example", url: "notaurl" }])),
    /url/,
  )
})

test("seed importer reports duplicate title and artist rows", () => {
  const first = { rowNumber: 2, album: normalizeAlbum({
    rank: "1",
    title: "Blue",
    artist: "Joni Mitchell",
    year: "1971",
    cover_url: "https://example.com/blue.jpg",
  }) }
  const second = { rowNumber: 3, album: normalizeAlbum({
    rank: "2",
    title: " blue ",
    artist: "JONI   MITCHELL",
    year: "1971",
    cover_url: "https://example.com/blue-2.jpg",
  }) }

  assert.equal(summarizeDuplicateTitleArtists([first, second]).length, 1)
})
