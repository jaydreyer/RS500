import assert from "node:assert/strict"
import test from "node:test"

import {
  buildGroupCompletionSummaries,
  buildMemberSummaries,
  buildStats,
} from "../lib/history-rules.ts"

const album = (id, title = id) => ({
  id,
  rank: 1,
  title,
  artist: "Artist",
  year: 1971,
  coverUrl: "https://example.com/cover.jpg",
})

const listen = ({
  id,
  userId,
  albumId,
  kind = "fresh",
  status = "rated",
  rating,
  groupDrawId = null,
  created = "2026-01-01T00:00:00.000Z",
  ratedAt = rating == null ? null : "2026-01-02T00:00:00.000Z",
}) => ({
  id,
  userId,
  albumId,
  groupDrawId,
  kind,
  status,
  rating,
  ratedAt,
  created,
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

  assert.equal(summary.loggedListens.length, 2)
  assert.equal(summary.ratedFreshListens.length, 2)
  assert.equal(summary.averageFreshRating, 5)
})

test("member summaries split active and completed fresh listens without counting active as logged", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O", email: "one@example.com" },
  ]
  const listens = [
    listen({ id: "1", userId: "one", albumId: "active", status: "listening", rating: null }),
    listen({ id: "2", userId: "one", albumId: "done", status: "rated", rating: 8 }),
    listen({ id: "3", userId: "one", albumId: "heard", kind: "skip", status: "rated", rating: 9 }),
  ]

  const [summary] = buildMemberSummaries(members, listens)

  assert.equal(summary.listens.length, 3)
  assert.equal(summary.loggedListens.length, 2)
  assert.equal(summary.activeFreshListens.length, 1)
  assert.equal(summary.completedFreshListens.length, 1)
  assert.equal(summary.skipListens.length, 1)
})

test("most albums logged excludes active unrated picks", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O", email: "one@example.com" },
    { id: "two", displayName: "Two", initials: "T", email: "two@example.com" },
  ]
  const listens = [
    listen({ id: "1", userId: "one", albumId: "rated-a", rating: 8 }),
    listen({ id: "2", userId: "one", albumId: "rated-b", rating: 7 }),
    listen({ id: "3", userId: "one", albumId: "active", status: "listening", rating: null }),
    listen({ id: "4", userId: "two", albumId: "rated-c", rating: 6 }),
  ]

  const summaries = buildMemberSummaries(members, listens)
  const stats = buildStats(summaries, listens)
  const one = summaries.find((summary) => summary.member.id === "one")

  assert.equal(one?.loggedListens.length, 2)
  assert.equal(stats.mostAlbumsLogged?.member.id, "one")
  assert.equal(stats.mostAlbumsLogged?.loggedListens.length, 2)
})

test("group completion summaries require every group listen to be rated", () => {
  const complete = [
    listen({
      id: "1",
      userId: "one",
      albumId: "group",
      groupDrawId: "draw-1",
      created: "2026-01-01T00:00:00.000Z",
      ratedAt: "2026-01-03T00:00:00.000Z",
      rating: 8,
    }),
    listen({
      id: "2",
      userId: "two",
      albumId: "group",
      groupDrawId: "draw-1",
      created: "2026-01-01T00:00:00.000Z",
      ratedAt: "2026-01-02T00:00:00.000Z",
      rating: 7,
    }),
    listen({
      id: "3",
      userId: "one",
      albumId: "waiting",
      groupDrawId: "draw-2",
      status: "listening",
      rating: null,
    }),
  ]

  const summaries = buildGroupCompletionSummaries(complete)

  assert.equal(summaries.length, 1)
  assert.equal(summaries[0].groupDrawId, "draw-1")
  assert.equal(summaries[0].completionMs, 2 * 24 * 60 * 60 * 1000)
})
