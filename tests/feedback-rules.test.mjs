import assert from "node:assert/strict"
import test from "node:test"

import {
  githubIssueStateToIdeaStatus,
  mapIdeaStatusToFeedbackStatus,
  normalizeFeedbackText,
  parseGitHubIssueUrl,
} from "../lib/feedback-rules.ts"

test("GitHub issue URLs are normalized into stable work references", () => {
  assert.deepEqual(
    parseGitHubIssueUrl(" https://github.com/example/spin-500/issues/143 "),
    {
      repository: "example/spin-500",
      issueNumber: 143,
      issueUrl: "https://github.com/example/spin-500/issues/143",
    },
  )
  assert.throws(
    () => parseGitHubIssueUrl("https://github.com/example/spin-500/pull/143"),
    /GitHub issue URL/,
  )
  assert.throws(
    () => parseGitHubIssueUrl("https://example.com/example/spin-500/issues/143"),
    /github.com/,
  )
})

test("GitHub states and labels map to friendly idea statuses", () => {
  assert.equal(
    githubIssueStateToIdeaStatus({
      labels: ["status:planned"],
      state: "open",
    }),
    "planned",
  )
  assert.equal(
    githubIssueStateToIdeaStatus({
      labels: [],
      state: "closed",
      stateReason: "not_planned",
    }),
    "not_planned",
  )
  assert.equal(
    githubIssueStateToIdeaStatus({
      labels: [],
      state: "closed",
      stateReason: "completed",
    }),
    "shipped",
  )
  assert.equal(
    githubIssueStateToIdeaStatus({
      labels: [],
      state: "open",
    }),
    null,
  )
})

test("public idea statuses map directly to user feedback statuses", () => {
  assert.equal(mapIdeaStatusToFeedbackStatus("in_progress"), "in_progress")
  assert.equal(mapIdeaStatusToFeedbackStatus("not_planned"), "not_planned")
})

test("feedback text normalization enforces meaningful and bounded input", () => {
  assert.equal(
    normalizeFeedbackText("  Helpful idea  ", {
      label: "Description",
      min: 4,
      max: 40,
    }),
    "Helpful idea",
  )
  assert.throws(
    () =>
      normalizeFeedbackText("no", {
        label: "Description",
        min: 4,
        max: 40,
      }),
    /at least 4/,
  )
  assert.equal(
    normalizeFeedbackText("", {
      label: "Response",
      max: 40,
      optional: true,
    }),
    "",
  )
})
