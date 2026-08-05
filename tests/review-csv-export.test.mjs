import assert from "node:assert/strict"
import test from "node:test"

import {
  formatReviewsCsv,
  getReviewsCsvFilename,
} from "../lib/review-csv-export.ts"

test("formats review rows as an Excel-friendly CSV", () => {
  const csv = formatReviewsCsv([
    {
      reviewedAt: "2026-08-04 14:30:00.000Z",
      rollingStoneRank: 42,
      albumTitle: 'Songs, "Mostly"',
      artist: "The Examples",
      releaseYear: 1977,
      rating: 8.5,
      review: "First line\nSecond line",
      listenType: "fresh",
      groupDraw: true,
    },
  ])

  assert.ok(csv.startsWith("\uFEFF"))
  assert.match(
    csv,
    /"reviewed_at","rolling_stone_rank","album","artist","release_year","rating","rating_scale","review","listen_type","group_draw"\r\n/,
  )
  assert.match(csv, /"Songs, ""Mostly"""/)
  assert.match(csv, /"First line\nSecond line"/)
  assert.match(csv, /"8\.5","10"/)
  assert.ok(csv.endsWith("\r\n"))
})

test("protects spreadsheet users from formula injection", () => {
  const csv = formatReviewsCsv([
    {
      reviewedAt: "2026-08-04",
      rollingStoneRank: 1,
      albumTitle: "=HYPERLINK(\"https://example.test\")",
      artist: "+1",
      releaseYear: 2026,
      rating: 10,
      review: "@SUM(1+1)",
      listenType: "skip",
      groupDraw: false,
    },
  ])

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test""\)"/)
  assert.match(csv, /"'\+1"/)
  assert.match(csv, /"'@SUM\(1\+1\)"/)
})

test("formats a dated, filesystem-safe download name", () => {
  assert.equal(
    getReviewsCsvFilename(new Date("2026-08-04T23:59:59.000Z")),
    "spin-500-reviews-2026-08-04.csv",
  )
})
