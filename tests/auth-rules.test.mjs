import assert from "node:assert/strict"
import test from "node:test"

import {
  isAdminEmail,
  validateDisplayName,
  validateInviteProfileInput,
  validateSignupInput,
} from "../lib/auth-rules.ts"

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

test("google signup validates invite code and display name without requiring password fields", () => {
  assert.equal(
    validateInviteProfileInput(
      {
        inviteCode: "vinyl-night",
        displayName: "Mavis",
      },
      configuredInviteCode,
    ),
    null,
  )
  assert.equal(
    validateInviteProfileInput(
      {
        inviteCode: "vinyl-night",
        displayName: "M",
      },
      configuredInviteCode,
    ),
    "Enter the name the board should show.",
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

test("admin email matching is case-insensitive and requires configuration", () => {
  assert.equal(isAdminEmail(" owner@example.com ", "OWNER@example.com"), true)
  assert.equal(isAdminEmail("member@example.com", "owner@example.com"), false)
  assert.equal(isAdminEmail("owner@example.com", undefined), false)
})
