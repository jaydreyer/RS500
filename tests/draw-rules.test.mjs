import assert from "node:assert/strict"
import test from "node:test"

import {
  assertActiveFreshListen,
  assertIndividualFreshListen,
  assertSoloDrawAllowed,
  DrawRuleError,
  SOLO_DRAW_GROUP_BLOCKED_MESSAGE,
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

test("individual fresh guard blocks group draw picks from skip/redraw handling", () => {
  assert.doesNotThrow(() => assertIndividualFreshListen({ kind: "fresh", status: "listening" }))
  assert.throws(
    () =>
      assertIndividualFreshListen({
        groupDrawId: "group-draw-1",
        kind: "fresh",
        status: "listening",
      }),
    /Group picks should be reviewed as group picks/,
  )
})

test("solo draw guard blocks active group members", () => {
  assert.doesNotThrow(() => assertSoloDrawAllowed(0))
  assert.throws(
    () => assertSoloDrawAllowed(1),
    new RegExp(SOLO_DRAW_GROUP_BLOCKED_MESSAGE),
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
  assert.equal(normalizeTake("x".repeat(TAKE_MAX_LENGTH + 50)).length, TAKE_MAX_LENGTH)
})

test("takes are truncated without splitting emoji surrogate pairs", () => {
  const take = `${"x".repeat(TAKE_MAX_LENGTH - 1)}😆 extra`
  const normalized = normalizeTake(take)

  assert.equal([...normalized].length, TAKE_MAX_LENGTH)
  assert.equal(normalized.endsWith("😆"), true)
  assert.equal(normalized.includes("\uFFFD"), false)
})
