import assert from "node:assert/strict"
import test from "node:test"

import {
  assertActiveFreshListen,
  DrawRuleError,
  getDrawablePool,
  normalizeTake,
  parseRatingValue,
} from "../lib/draw-rules.ts"

test("drawable pool excludes every album the user has already logged", () => {
  const pool = getDrawablePool(
    [
      { id: "album-a", rank: 1 },
      { id: "album-b", rank: 2 },
      { id: "album-c", rank: 3 },
    ],
    new Set(["album-a", "album-c"]),
  )

  assert.deepEqual(pool, [{ id: "album-b", rank: 2 }])
})

test("active fresh guard only allows unrated fresh picks", () => {
  assert.doesNotThrow(() => assertActiveFreshListen({ kind: "fresh", status: "listening" }))
  assert.throws(
    () => assertActiveFreshListen({ kind: "fresh", status: "rated" }),
    DrawRuleError,
  )
  assert.throws(
    () => assertActiveFreshListen({ kind: "skip", status: "rated" }),
    DrawRuleError,
  )
})

test("rating parser enforces integer scale bounds", () => {
  assert.equal(parseRatingValue("10", { min: 1, max: 10 }), 10)
  assert.throws(() => parseRatingValue("10.5", { min: 1, max: 10 }), DrawRuleError)
  assert.throws(() => parseRatingValue("0", { min: 1, max: 10 }), DrawRuleError)
})

test("takes are trimmed and capped", () => {
  assert.equal(normalizeTake("  A tight little note  "), "A tight little note")
  assert.equal(normalizeTake("x".repeat(220)).length, 180)
})
