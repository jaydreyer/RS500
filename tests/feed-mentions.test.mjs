import assert from "node:assert/strict"
import test from "node:test"

import {
  extractMentionHandles,
  getPreferredMentionHandle,
  resolveMentionRecipients,
} from "../lib/feed-mentions.ts"

const users = [
  {
    id: "jay",
    display_name: "Jay Dreyer",
    email: "jay@example.com",
  },
  {
    id: "mavis",
    display_name: "Mavis Staples",
    email: "mavis@example.com",
  },
  {
    id: "sam-one",
    display_name: "Sam Cooke",
    email: "sam.cooke@example.com",
  },
  {
    id: "sam-two",
    display_name: "Sam Phillips",
    email: "sam.phillips@example.com",
  },
]

test("mention extraction normalizes typed handles", () => {
  assert.deepEqual(extractMentionHandles("hey @JayD and @mavis-staples"), [
    "jayd",
    "mavisstaples",
  ])
})

test("mention recipients resolve unique handles only", () => {
  assert.deepEqual(
    resolveMentionRecipients(users, ["jayd", "sam"], "mavis").map((user) => user.id),
    ["jay"],
  )
})

test("preferred mention handles use a unique display handle", () => {
  assert.equal(getPreferredMentionHandle(users[0], users, "mavis"), "JayD")
  assert.equal(getPreferredMentionHandle(users[1], users, "jay"), "MavisS")
  assert.equal(getPreferredMentionHandle(users[2], users, "jay"), "SamC")
})
