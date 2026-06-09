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

test("rating parser allows one decimal place within scale bounds", () => {
  const scale = { min: 1, max: 10, step: 0.1, precision: 1 }

  assert.equal(parseRatingValue("10", scale), 10)
  assert.equal(parseRatingValue("10.0", scale), 10)
  assert.equal(parseRatingValue("9.1", scale), 9.1)
  assert.equal(parseRatingValue("6.7", scale), 6.7)
  assert.throws(() => parseRatingValue("9.12", scale), DrawRuleError)
  assert.throws(() => parseRatingValue("0.9", scale), DrawRuleError)
  assert.throws(() => parseRatingValue("10.1", scale), DrawRuleError)
})

test("takes are trimmed and capped", () => {
  assert.equal(normalizeTake("  A tight little note  "), "A tight little note")
  assert.equal(normalizeTake("x".repeat(220)).length, 180)
})
