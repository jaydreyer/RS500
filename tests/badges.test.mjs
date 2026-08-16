import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBadgeProgress,
  countTrackProgress,
  WRITTEN_REVIEW_MIN_LENGTH,
} from "../lib/badges.ts"

const listen = ({
  kind = "fresh",
  status = "rated",
  rating = 8,
  take = "",
  created = "2026-01-01T00:00:00.000Z",
  ratedAt = "2026-01-02T00:00:00.000Z",
} = {}) => ({
  kind,
  status,
  rating,
  take,
  created,
  ratedAt,
})

test("listening badges count only completed fresh picks", () => {
  const listens = [
    ...Array.from({ length: 10 }, () => listen()),
    listen({ kind: "skip" }),
    listen({ status: "listening", rating: null, ratedAt: null }),
    listen({ status: "rated", rating: null }),
  ]

  const badges = buildBadgeProgress(listens, "listening")

  assert.equal(countTrackProgress(listens, "listening"), 10)
  assert.equal(badges[0].state, "earned")
  assert.equal(badges[0].progress, 10)
  assert.equal(badges[1].state, "next")
  assert.equal(badges[1].remaining, 15)
  assert.equal(badges[2].state, "locked")
})

test("writing badges require a meaningful written take", () => {
  const qualifyingTake = "x".repeat(WRITTEN_REVIEW_MIN_LENGTH)
  const listens = [
    ...Array.from({ length: 5 }, () => listen({ take: qualifyingTake })),
    listen({ take: `  ${"x".repeat(WRITTEN_REVIEW_MIN_LENGTH - 1)}  ` }),
    listen({ kind: "skip", take: qualifyingTake }),
    listen({ take: "" }),
  ]

  const badges = buildBadgeProgress(listens, "writing")

  assert.equal(countTrackProgress(listens, "writing"), 5)
  assert.equal(badges[0].state, "earned")
  assert.equal(badges[1].state, "next")
  assert.equal(badges[1].remaining, 20)
})

test("earned date comes from the review that crossed the threshold", () => {
  const listens = Array.from({ length: 10 }, (_, index) =>
    listen({
      created: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      ratedAt: `2026-02-${String(10 - index).padStart(2, "0")}T00:00:00.000Z`,
    }),
  )

  const [badge] = buildBadgeProgress(listens, "listening")

  assert.equal(badge.state, "earned")
  assert.equal(badge.earnedAt, "2026-02-10T00:00:00.000Z")
})

test("a completed badge case has no next or locked states", () => {
  const listens = Array.from({ length: 500 }, () => listen())
  const badges = buildBadgeProgress(listens, "listening")

  assert.ok(badges.every((badge) => badge.state === "earned"))
})
