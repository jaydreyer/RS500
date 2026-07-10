import assert from "node:assert/strict"
import test from "node:test"

import { getLoginUrl, getSafeReturnPath } from "../lib/auth-return.ts"

test("auth return paths keep safe local destinations", () => {
  assert.equal(getSafeReturnPath("/albums/abc?tab=reviews"), "/albums/abc?tab=reviews")
  assert.equal(getSafeReturnPath("https://example.com"), "/pick")
  assert.equal(getSafeReturnPath("//example.com"), "/pick")
  assert.equal(getSafeReturnPath("/auth?next=/settings"), "/pick")
})

test("expired-session login urls retain the current page", () => {
  const url = new URL(getLoginUrl("/albums/abc"), "https://spin500.example.com")

  assert.equal(url.pathname, "/auth")
  assert.equal(url.searchParams.get("mode"), "login")
  assert.equal(url.searchParams.get("next"), "/albums/abc")
  assert.equal(url.searchParams.get("reason"), "session-expired")
})
