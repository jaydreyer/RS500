import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDecadeSummaries,
  buildGroupCompletionSummaries,
  buildMemberCrewComparisons,
  buildMemberSummaries,
  buildRankingMomentum,
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

test("member superlatives exclude deactivated members without removing their ratings", () => {
  const members = [
    { id: "active", displayName: "Active", initials: "A", email: "active@example.com" },
    {
      id: "archived",
      displayName: "Archived",
      initials: "AR",
      email: "",
      isDeactivated: true,
    },
  ]
  const listens = [
    listen({ id: "1", userId: "active", albumId: "shared", rating: 7 }),
    listen({ id: "2", userId: "active", albumId: "active-b", rating: 7 }),
    listen({ id: "3", userId: "active", albumId: "active-c", rating: 7 }),
    listen({ id: "4", userId: "archived", albumId: "shared", rating: 1 }),
    listen({ id: "5", userId: "archived", albumId: "archived-b", rating: 1 }),
    listen({ id: "6", userId: "archived", albumId: "archived-c", rating: 1 }),
    listen({ id: "7", userId: "archived", albumId: "archived-d", rating: 1 }),
  ]

  const stats = buildStats(buildMemberSummaries(members, listens), listens)

  assert.equal(stats.harshestRater?.member.id, "active")
  assert.equal(stats.mostGenerousRater?.member.id, "active")
  assert.equal(stats.mostAssignedCompleted?.member.id, "active")
  assert.equal(stats.crewRankedAlbums[0].album.id, "shared")
  assert.equal(stats.crewRankedAlbums[0].averageRating, 4)
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

test("crew ranking uses album average, review count, then original rank", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O", email: "one@example.com" },
    { id: "two", displayName: "Two", initials: "T", email: "two@example.com" },
    { id: "three", displayName: "Three", initials: "TH", email: "three@example.com" },
  ]
  const listens = [
    {
      ...listen({ id: "a-1", userId: "one", albumId: "average-eight", rating: 7 }),
      album: { ...album("average-eight"), rank: 50 },
    },
    {
      ...listen({ id: "a-2", userId: "two", albumId: "average-eight", rating: 9 }),
      album: { ...album("average-eight"), rank: 50 },
    },
    listen({ id: "b-1", userId: "one", albumId: "more-reviews", rating: 8 }),
    listen({ id: "b-2", userId: "two", albumId: "more-reviews", rating: 8 }),
    listen({ id: "b-3", userId: "three", albumId: "more-reviews", rating: 8 }),
    {
      ...listen({ id: "c-1", userId: "one", albumId: "original-rank", rating: 8 }),
      album: { ...album("original-rank"), rank: 12 },
    },
    {
      ...listen({ id: "c-2", userId: "two", albumId: "original-rank", rating: 8 }),
      album: { ...album("original-rank"), rank: 12 },
    },
    listen({ id: "solo", userId: "one", albumId: "provisional", rating: 10 }),
  ]

  const stats = buildStats(buildMemberSummaries(members, listens), listens)

  assert.deepEqual(
    stats.crewRankedAlbums.map((summary) => summary.album.id),
    ["more-reviews", "original-rank", "average-eight"],
  )
  assert.deepEqual(
    stats.provisionalAlbums.map((summary) => summary.album.id),
    ["provisional"],
  )
})

test("ranking movement compares crew and Rolling Stone order within the eligible set", () => {
  const members = [
    { id: "one", displayName: "One", initials: "O" },
    { id: "two", displayName: "Two", initials: "T" },
  ]
  const rankedListens = [
    { ...listen({ id: "a1", userId: "one", albumId: "a", rating: 4 }), album: { ...album("a"), rank: 10 } },
    { ...listen({ id: "a2", userId: "two", albumId: "a", rating: 4 }), album: { ...album("a"), rank: 10 } },
    { ...listen({ id: "b1", userId: "one", albumId: "b", rating: 7 }), album: { ...album("b"), rank: 100 } },
    { ...listen({ id: "b2", userId: "two", albumId: "b", rating: 7 }), album: { ...album("b"), rank: 100 } },
    { ...listen({ id: "c1", userId: "one", albumId: "c", rating: 9 }), album: { ...album("c"), rank: 400 } },
    { ...listen({ id: "c2", userId: "two", albumId: "c", rating: 9 }), album: { ...album("c"), rank: 400 } },
  ]

  const stats = buildStats(buildMemberSummaries(members, rankedListens), rankedListens)

  assert.deepEqual(
    stats.biggestClimbers.map(({ summary, movement }) => [summary.album.id, movement]),
    [["c", 2]],
  )
  assert.deepEqual(
    stats.biggestDrops.map(({ summary, movement }) => [summary.album.id, movement]),
    [["a", -2]],
  )
})

test("strongest consensus requires three reviewers and favors smaller spreads", () => {
  const members = ["one", "two", "three"].map((id) => ({
    id,
    displayName: id,
    initials: id[0],
  }))
  const consensusListens = [
    listen({ id: "tight-1", userId: "one", albumId: "tight", rating: 8 }),
    listen({ id: "tight-2", userId: "two", albumId: "tight", rating: 8.2 }),
    listen({ id: "tight-3", userId: "three", albumId: "tight", rating: 8.1 }),
    listen({ id: "wide-1", userId: "one", albumId: "wide", rating: 5 }),
    listen({ id: "wide-2", userId: "two", albumId: "wide", rating: 9 }),
    listen({ id: "wide-3", userId: "three", albumId: "wide", rating: 7 }),
    listen({ id: "two-1", userId: "one", albumId: "two-only", rating: 8 }),
    listen({ id: "two-2", userId: "two", albumId: "two-only", rating: 8 }),
  ]

  const stats = buildStats(
    buildMemberSummaries(members, consensusListens),
    consensusListens,
  )

  assert.deepEqual(
    stats.strongestConsensus.map((summary) => summary.album.id),
    ["tight", "wide"],
  )
})

test("member crew comparisons exclude the member's own score from the crew average", () => {
  const members = ["me", "one", "two"].map((id) => ({
    id,
    displayName: id,
    initials: id[0],
  }))
  const comparisonListens = [
    listen({ id: "me", userId: "me", albumId: "shared", rating: 10 }),
    listen({ id: "one", userId: "one", albumId: "shared", rating: 4 }),
    listen({ id: "two", userId: "two", albumId: "shared", rating: 6 }),
  ]
  const stats = buildStats(
    buildMemberSummaries(members, comparisonListens),
    comparisonListens,
  )
  const [comparison] = buildMemberCrewComparisons(stats.crewRankedAlbums, "me")

  assert.equal(comparison.memberRating, 10)
  assert.equal(comparison.otherCrewAverage, 5)
  assert.equal(comparison.difference, 5)
  assert.equal(comparison.otherRatingCount, 2)
})

test("decade and momentum summaries use rated history without snapshots", () => {
  const historyListens = [
    {
      ...listen({
        id: "sixties-1",
        userId: "one",
        albumId: "sixties",
        rating: 8,
        ratedAt: "2026-07-20T00:00:00.000Z",
      }),
      album: { ...album("sixties"), year: 1969 },
    },
    {
      ...listen({
        id: "sixties-2",
        userId: "two",
        albumId: "sixties",
        rating: 6,
        ratedAt: "2026-07-21T00:00:00.000Z",
      }),
      album: { ...album("sixties"), year: 1969 },
    },
    {
      ...listen({
        id: "seventies-1",
        userId: "one",
        albumId: "seventies",
        rating: 9,
        ratedAt: "2026-06-01T00:00:00.000Z",
      }),
      album: { ...album("seventies"), year: 1977 },
    },
  ]
  const stats = buildStats(
    buildMemberSummaries(
      [
        { id: "one", displayName: "One", initials: "O" },
        { id: "two", displayName: "Two", initials: "T" },
      ],
      historyListens,
    ),
    historyListens,
  )
  const momentum = buildRankingMomentum(
    stats.crewRankedAlbums,
    new Date("2026-07-01T00:00:00.000Z"),
  )

  assert.deepEqual(buildDecadeSummaries(historyListens), [
    { decade: 1960, averageRating: 7, ratingCount: 2, albumCount: 1 },
    { decade: 1970, averageRating: 9, ratingCount: 1, albumCount: 1 },
  ])
  assert.equal(momentum.ratingCount, 2)
  assert.equal(momentum.albumCount, 1)
  assert.equal(momentum.newlyRanked[0].summary.album.id, "sixties")
  assert.equal(momentum.newlyRanked[0].rankedAt, "2026-07-21T00:00:00.000Z")
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
