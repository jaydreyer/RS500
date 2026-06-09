import assert from "node:assert/strict"
import test from "node:test"

import { mapStoredRating } from "../lib/listen-rating.ts"

test("stored ratings only count after a listen is rated", () => {
  assert.equal(mapStoredRating("listening", 0), null)
  assert.equal(mapStoredRating("listening", 8.4), null)
  assert.equal(mapStoredRating("rated", 0), 0)
  assert.equal(mapStoredRating("rated", 8.4), 8.4)
  assert.equal(mapStoredRating("rated", null), null)
})
