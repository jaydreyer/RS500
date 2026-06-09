import assert from "node:assert/strict"
import test from "node:test"

import { validateDisplayName, validateSignupInput } from "../lib/auth-rules.ts"

const configuredInviteCode = "VINYL-NIGHT"

test("invite-code signup accepts the configured code case-insensitively", () => {
  assert.equal(
    validateSignupInput(
      {
        inviteCode: " vinyl-night ",
        displayName: "Mavis",
        email: "mavis@example.com",
        password: "correcthorse",
      },
      configuredInviteCode,
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
      configuredInviteCode,
    ),
    "That invite code is not valid. Ask the crew.",
  )
})

test("display names must be recognizable but compact", () => {
  assert.equal(validateDisplayName("Mavis"), null)
  assert.equal(validateDisplayName("M"), "Enter the name the board should show.")
  assert.equal(
    validateDisplayName("A".repeat(81)),
    "Display name must be 80 characters or less.",
  )
})
