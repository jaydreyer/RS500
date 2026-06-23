import assert from "node:assert/strict"
import test from "node:test"

import { AUTH_COOKIE_SECURE_ENV, shouldUseSecureAuthCookie } from "../lib/auth-cookie.ts"

const originalNodeEnv = process.env.NODE_ENV
const originalSecureOverride = process.env[AUTH_COOKIE_SECURE_ENV]

test.afterEach(() => {
  setEnv("NODE_ENV", originalNodeEnv)
  setEnv(AUTH_COOKIE_SECURE_ENV, originalSecureOverride)
})

test("auth cookies are secure behind an HTTPS proxy", () => {
  process.env.NODE_ENV = "production"

  assert.equal(
    shouldUseSecureAuthCookie(headers({ "x-forwarded-proto": "https", host: "spin500.example.com" })),
    true,
  )
})

test("auth cookies are not secure for HTTP LAN mobile testing", () => {
  process.env.NODE_ENV = "production"

  assert.equal(
    shouldUseSecureAuthCookie(headers({ "x-forwarded-proto": "http", host: "192.168.1.20:3000" })),
    false,
  )
})

test("auth cookies are not secure for private hosts without forwarded proto", () => {
  process.env.NODE_ENV = "production"

  assert.equal(shouldUseSecureAuthCookie(headers({ host: "10.0.0.4:3000" })), false)
})

test("auth cookie secure override wins over request inference", () => {
  process.env.NODE_ENV = "production"
  process.env[AUTH_COOKIE_SECURE_ENV] = "false"

  assert.equal(
    shouldUseSecureAuthCookie(headers({ "x-forwarded-proto": "https", host: "spin500.example.com" })),
    false,
  )
})

function headers(values) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]))

  return {
    get(key) {
      return normalized.get(key.toLowerCase()) ?? null
    },
  }
}

function setEnv(key, value) {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}
