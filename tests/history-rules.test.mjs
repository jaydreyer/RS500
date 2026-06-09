import assert from "node:assert/strict"
import test from "node:test"

import { buildMemberSummaries, buildStats } from "../lib/history-rules.ts"

const album = (id, title = id) => ({
  id,
  rank: 1,
  title,
  artist: "Artist",
  year: 1971,
  coverUrl: "https://example.com/cover.jpg",
})

const listen = ({ id, userId, albumId, kind = "fresh", rating }) => ({
  id,
  userId,
  albumId,
  kind,
  rating,
  album: album(albumId),
})

test("harshest and most generous raters require three rated fresh listens", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O", email: "one@example.com" },
    { id: "two", displayName: "Two", initials: "T", email: "two@example.com" },
    { id: "short", displayName: "Short", initials: "S", email: "short@example.com" },
  ]
  const listens = [
    listen({ id: "1", userId: "one", albumId: "a", rating: 4 }),
    listen({ id: "2", userId: "one", albumId: "b", rating: 5 }),
    listen({ id: "3", userId: "one", albumId: "c", rating: 6 }),
    listen({ id: "4", userId: "two", albumId: "d", rating: 8 }),
    listen({ id: "5", userId: "two", albumId: "e", rating: 9 }),
    listen({ id: "6", userId: "two", albumId: "f", rating: 10 }),
    listen({ id: "7", userId: "short", albumId: "g", rating: 1 }),
    listen({ id: "8", userId: "short", albumId: "h", rating: 1 }),
  ]

  const stats = buildStats(buildMemberSummaries(members, listens), listens)

  assert.equal(stats.harshestRater?.member.id, "one")
  assert.equal(stats.mostGenerousRater?.member.id, "two")
})

test("shared albums include only albums rated by at least two members", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O", email: "one@example.com" },
    { id: "two", displayName: "Two", initials: "T", email: "two@example.com" },
  ]
  const listens = [
    listen({ id: "1", userId: "one", albumId: "shared", rating: 3 }),
    listen({ id: "2", userId: "two", albumId: "shared", rating: 9 }),
    listen({ id: "3", userId: "one", albumId: "solo", rating: 10 }),
  ]

  const stats = buildStats(buildMemberSummaries(members, listens), listens)

  assert.equal(stats.sharedAlbums.length, 1)
  assert.equal(stats.sharedAlbums[0].album.id, "shared")
  assert.equal(stats.sharedAlbums[0].spread, 6)
})

test("member averages ignore unrated listens but include rated zeroes", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O", email: "one@example.com" },
  ]
  const listens = [
    listen({ id: "1", userId: "one", albumId: "rated-zero", rating: 0 }),
    listen({ id: "2", userId: "one", albumId: "rated-ten", rating: 10 }),
    listen({ id: "3", userId: "one", albumId: "unrated", rating: null }),
  ]

  const [summary] = buildMemberSummaries(members, listens)

  assert.equal(summary.ratedFreshListens.length, 2)
  assert.equal(summary.averageFreshRating, 5)
})
