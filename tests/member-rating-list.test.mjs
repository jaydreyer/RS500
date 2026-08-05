import assert from "node:assert/strict"
import test from "node:test"

import { formatMemberRatingList } from "../lib/member-rating-list.ts"

const rating = (title, artist, score) => ({
  album: { title, artist },
  rating: score,
})

test("formats a portable member rating list in the provided order", () => {
  const result = formatMemberRatingList("Maya", [
    rating("Purple Rain", "Prince", 8.5),
    rating("Abbey Road", "The Beatles", 9),
  ])

  assert.equal(
    result,
    [
      "Spin 500 ratings — Maya (2)",
      "",
      "Purple Rain — Prince — 8.5/10",
      "Abbey Road — The Beatles — 9/10",
    ].join("\n"),
  )
})

test("omits unrated entries and reports the copied rating count", () => {
  const result = formatMemberRatingList("Maya", [
    rating("In progress", "Artist", null),
    rating("Rated", "Artist", 7.2),
  ])

  assert.equal(result, "Spin 500 ratings — Maya (1)\n\nRated — Artist — 7.2/10")
})

test("formats an empty rating list as a heading", () => {
  assert.equal(formatMemberRatingList("Maya", []), "Spin 500 ratings — Maya (0)")
})
