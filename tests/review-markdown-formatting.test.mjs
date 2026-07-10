import assert from "node:assert/strict"
import test from "node:test"

import { applyReviewMarkdownFormat } from "../lib/review-markdown-formatting.ts"

test("adds a bulleted list to selected lines", () => {
  const result = applyReviewMarkdownFormat("intro\nfirst\nsecond\noutro", 6, 18, "bullet-list")

  assert.equal(result.value, "intro\n- first\n- second\noutro")
  assert.deepEqual(
    [result.selectionStart, result.selectionEnd],
    [6, 22],
  )
})

test("adds and removes a numbered list", () => {
  const added = applyReviewMarkdownFormat("first\nsecond", 0, 12, "numbered-list")
  assert.equal(added.value, "1. first\n2. second")

  const removed = applyReviewMarkdownFormat(
    added.value,
    added.selectionStart,
    added.selectionEnd,
    "numbered-list",
  )
  assert.equal(removed.value, "first\nsecond")
})

test("switches directly between list styles without stacking markers", () => {
  const result = applyReviewMarkdownFormat("- first\n- second", 0, 16, "numbered-list")

  assert.equal(result.value, "1. first\n2. second")
})

test("formats the current line and keeps the caret after the marker", () => {
  const result = applyReviewMarkdownFormat("first\nsecond", 9, 9, "bullet-list")

  assert.equal(result.value, "first\n- second")
  assert.deepEqual([result.selectionStart, result.selectionEnd], [11, 11])
})

test("keeps bold and italic wrapping behavior", () => {
  const bold = applyReviewMarkdownFormat("great record", 0, 5, "**")
  assert.equal(bold.value, "**great** record")
  assert.deepEqual([bold.selectionStart, bold.selectionEnd], [2, 7])

  const italic = applyReviewMarkdownFormat("great", 5, 5, "*")
  assert.equal(italic.value, "great**")
  assert.deepEqual([italic.selectionStart, italic.selectionEnd], [6, 6])
})
