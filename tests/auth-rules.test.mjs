import assert from "node:assert/strict"
import test from "node:test"

import { CREW_INVITE_CODE, validateSignupInput } from "../lib/auth-rules.ts"

test("invite-code signup accepts the configured code case-insensitively", () => {
  assert.equal(
    validateSignupInput(
      {
        inviteCode: " vinyl-night ",
        displayName: "Mavis",
        email: "mavis@example.com",
        password: "correcthorse",
      },
      CREW_INVITE_CODE,
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
      CREW_INVITE_CODE,
    ),
    "That invite code is not valid. Ask the crew.",
  )
})
