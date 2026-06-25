import assert from "node:assert/strict"
import test from "node:test"

import {
  assertActiveFreshListen,
  clampStoredTake,
  clampTake,
  countTakeCharacters,
  DrawRuleError,
  TAKE_STORAGE_MAX_LENGTH,
  TAKE_MAX_LENGTH,
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
  const scale = { min: 0, max: 10, step: 0.1, precision: 1 }

  assert.equal(parseRatingValue("0", scale), 0)
  assert.equal(parseRatingValue("0.0", scale), 0)
  assert.equal(parseRatingValue(".9", scale), 0.9)
  assert.equal(parseRatingValue("0.9", scale), 0.9)
  assert.equal(parseRatingValue("10", scale), 10)
  assert.equal(parseRatingValue("10.0", scale), 10)
  assert.equal(parseRatingValue("9.1", scale), 9.1)
  assert.equal(parseRatingValue("6.7", scale), 6.7)
  assert.throws(() => parseRatingValue("9.12", scale), DrawRuleError)
  assert.throws(() => parseRatingValue(".", scale), DrawRuleError)
  assert.throws(() => parseRatingValue("-.1", scale), DrawRuleError)
  assert.throws(() => parseRatingValue("10.1", scale), DrawRuleError)
})

test("takes are trimmed and capped", () => {
  assert.equal(normalizeTake("  A tight little note  "), "A tight little note")
  assert.equal(countTakeCharacters("a b\nc"), 5)
  assert.equal(countTakeCharacters(clampTake("x".repeat(TAKE_MAX_LENGTH + 50))), TAKE_MAX_LENGTH)
  assert.equal(clampStoredTake("x".repeat(TAKE_STORAGE_MAX_LENGTH + 50)).length, TAKE_STORAGE_MAX_LENGTH)
  assert.equal(countTakeCharacters("🎧".repeat(10)), 10)
  assert.equal(countTakeCharacters("🇺🇸".repeat(10)), 10)
  assert.equal(countTakeCharacters("👨‍👩‍👧‍👦".repeat(10)), 10)
  assert.equal(countTakeCharacters("e\u0301".repeat(10)), 10)
  assert.equal(countTakeCharacters(clampTake("🎧".repeat(TAKE_MAX_LENGTH + 50))), TAKE_MAX_LENGTH)
  assert.equal(countTakeCharacters(clampTake("👨‍👩‍👧‍👦".repeat(TAKE_MAX_LENGTH + 50))), TAKE_MAX_LENGTH)
})
