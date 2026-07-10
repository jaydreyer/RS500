import assert from "node:assert/strict"
import test from "node:test"

import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  decodeGoogleOAuthState,
  encodeGoogleOAuthState,
  getGoogleOAuthMode,
  isExpiredGoogleOAuthState,
  normalizeGoogleUserInfo,
} from "../lib/google-oauth.ts"

test("google oauth state round-trips and expires after ten minutes", () => {
  const state = createGoogleOAuthState("signup", "Mavis", "/albums/abc")
  const decoded = decodeGoogleOAuthState(encodeGoogleOAuthState(state))

  assert.deepEqual(decoded, state)
  assert.equal(isExpiredGoogleOAuthState(state, state.createdAt + 10 * 60 * 1000), false)
  assert.equal(isExpiredGoogleOAuthState(state, state.createdAt + 10 * 60 * 1000 + 1), true)
  assert.equal(decoded.nextPath, "/albums/abc")
})

test("google authorization url includes PKCE and requested scopes", () => {
  const state = createGoogleOAuthState("login", "")
  const url = buildGoogleAuthorizationUrl(
    {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://example.com/api/auth/google/callback",
    },
    state,
  )

  assert.equal(url.searchParams.get("client_id"), "client-id")
  assert.equal(url.searchParams.get("redirect_uri"), "https://example.com/api/auth/google/callback")
  assert.equal(url.searchParams.get("response_type"), "code")
  assert.equal(url.searchParams.get("scope"), "openid email profile")
  assert.equal(url.searchParams.get("state"), state.state)
  assert.equal(url.searchParams.get("code_challenge_method"), "S256")
  assert.ok(url.searchParams.get("code_challenge"))
})

test("google user info requires a stable subject and valid email", () => {
  assert.deepEqual(
    normalizeGoogleUserInfo({
      sub: "google-user-1",
      email: "MAVIS@example.com",
      email_verified: true,
      name: "Mavis",
    }),
    {
      sub: "google-user-1",
      email: "mavis@example.com",
      emailVerified: true,
      name: "Mavis",
    },
  )
  assert.equal(normalizeGoogleUserInfo({ email: "mavis@example.com" }), null)
})

test("google oauth mode defaults to signup", () => {
  assert.equal(getGoogleOAuthMode("login"), "login")
  assert.equal(getGoogleOAuthMode("signup"), "signup")
  assert.equal(getGoogleOAuthMode(null), "signup")
})
