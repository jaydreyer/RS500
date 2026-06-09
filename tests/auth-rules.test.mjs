import assert from "node:assert/strict"
import test from "node:test"

import { validateSignupInput } from "../lib/auth-rules.ts"

test("invite-code signup accepts the configured code case-insensitively", () => {
  assert.equal(
    validateSignupInput(
      {
        inviteCode: " needle-drop ",
        displayName: "Mavis",
        email: "mavis@example.com",
        password: "correcthorse",
      },
      "NEEDLE-DROP",
    ),
    null,
  )
})

test("invite-code signup rejects invalid codes before account creation", () => {
  assert.equal(
    validateSignupInput(
      {
        inviteCode: "WRONG",
        displayName: "Mavis",
        email: "mavis@example.com",
        password: "correcthorse",
      },
      "NEEDLE-DROP",
    ),
    "That invite code is not valid. Ask the crew.",
  )
})
