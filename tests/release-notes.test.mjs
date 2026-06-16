import assert from "node:assert/strict"
import test from "node:test"

import {
  getReleaseNoteId,
  latestReleaseNoteId,
  releaseNotes,
} from "../lib/release-notes.ts"

test("latest release note id tracks the newest release note", () => {
  assert.equal(latestReleaseNoteId, getReleaseNoteId(releaseNotes[0]))
})

test("release note ids change when release title or date changes", () => {
  assert.notEqual(
    getReleaseNoteId({
      ...releaseNotes[0],
      title: `${releaseNotes[0].title} again`,
    }),
    latestReleaseNoteId,
  )
  assert.notEqual(
    getReleaseNoteId({
      ...releaseNotes[0],
      date: "2026-06-17",
    }),
    latestReleaseNoteId,
  )
})
