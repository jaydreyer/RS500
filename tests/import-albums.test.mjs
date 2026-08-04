import assert from "node:assert/strict"
import test from "node:test"

import {
  downloadAlbumCoverFile,
  hasAlbumChanges,
  normalizeAlbum,
  parseReviewLinks,
  summarizeDuplicateTitleArtists,
  upsertAlbum,
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

test("cover downloader retries transient failures and validates the image", async () => {
  let attempts = 0
  const file = await downloadAlbumCoverFile(
    "https://example.com/cover",
    12,
    {
      attempts: 2,
      retryDelayMs: 0,
      fetchImpl: async () => {
        attempts += 1
        if (attempts === 1) {
          return new Response("temporary failure", { status: 500 })
        }

        return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
          headers: { "content-type": "image/jpeg" },
        })
      },
    },
  )

  assert.equal(attempts, 2)
  assert.equal(file.name, "rs500-12-cover.jpg")
  assert.equal(file.type, "image/jpeg")
  assert.equal(file.size, 4)
})

test("album upsert stores a missing cover image without changing source metadata", async () => {
  const album = normalizeAlbum({
    rank: "1",
    title: "What's Going On",
    artist: "Marvin Gaye",
    year: "1971",
    cover_url: "https://example.com/cover.jpg",
  })
  const updates = []
  const existing = {
    id: "album-1",
    ...album,
    cover_image: "",
  }
  const pb = {
    filter: () => "rank = 1",
    collection: () => ({
      getFirstListItem: async () => existing,
      update: async (id, payload) => updates.push({ id, payload }),
    }),
  }
  const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" })

  const result = await upsertAlbum(pb, album, false, {
    downloadCover: async () => coverFile,
  })

  assert.equal(result, "updated")
  assert.equal(updates.length, 1)
  assert.equal(updates[0].id, existing.id)
  assert.equal(updates[0].payload.cover_image, coverFile)
  assert.equal(updates[0].payload.cover_url, album.cover_url)
})
