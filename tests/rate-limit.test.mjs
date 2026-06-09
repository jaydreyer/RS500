import assert from "node:assert/strict"
import test from "node:test"

import { consumeRateLimit, resetRateLimitForTests } from "../lib/rate-limit-core.ts"

test("rate limiter allows requests until the configured limit", () => {
  resetRateLimitForTests()

  assert.equal(
    consumeRateLimit("login:ip:127.0.0.1", {
      limit: 2,
      windowMs: 60_000,
      now: 1_000,
    }).allowed,
    true,
  )
  assert.equal(
    consumeRateLimit("login:ip:127.0.0.1", {
      limit: 2,
      windowMs: 60_000,
      now: 2_000,
    }).allowed,
    true,
  )
  assert.equal(
    consumeRateLimit("login:ip:127.0.0.1", {
      limit: 2,
      windowMs: 60_000,
      now: 3_000,
    }).allowed,
    false,
  )
})

test("rate limiter resets after the window expires", () => {
  resetRateLimitForTests()

  consumeRateLimit("signup:email:mavis@example.com", {
    limit: 1,
    windowMs: 10_000,
    now: 1_000,
  })

  assert.equal(
    consumeRateLimit("signup:email:mavis@example.com", {
      limit: 1,
      windowMs: 10_000,
      now: 12_000,
    }).allowed,
    true,
  )
})
