import process from "node:process"

import { getMissingEnv, loadProjectEnv } from "./env.mjs"

export const DEFAULT_REVIEW_APP_URL = "http://localhost:3000"
export const DEFAULT_REVIEW_PB_URL = "http://127.0.0.1:8092"
export const DEFAULT_REVIEW_PB_DATA_DIR = "tmp/pb_review_data"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export function loadReviewEnv({ enableDevLogin = true } = {}) {
  loadProjectEnv()

  const pbUrl = process.env.SPIN500_REVIEW_PB_URL || DEFAULT_REVIEW_PB_URL
  const appUrl = process.env.SPIN500_REVIEW_APP_URL || DEFAULT_REVIEW_APP_URL

  assertLocalHttpUrl(pbUrl, "SPIN500_REVIEW_PB_URL")
  assertLocalHttpUrl(appUrl, "SPIN500_REVIEW_APP_URL")

  process.env.NEXT_PUBLIC_PB_URL = pbUrl
  process.env.SPIN500_LOCAL_PB_URL = pbUrl
  process.env.SPIN500_LOCAL_PB_DATA_DIR =
    process.env.SPIN500_REVIEW_PB_DATA_DIR || DEFAULT_REVIEW_PB_DATA_DIR
  process.env.SPIN500_REVIEW_APP_URL = appUrl
  process.env.PORT = new URL(appUrl).port || "3000"

  if (enableDevLogin) {
    process.env.ENABLE_DEV_LOGIN = "1"
  }

  process.env.SERVER_ACTION_ALLOWED_ORIGINS = withAllowedOrigin(
    process.env.SERVER_ACTION_ALLOWED_ORIGINS,
    new URL(appUrl).host,
  )

  return {
    appUrl,
    pbDataDir: process.env.SPIN500_LOCAL_PB_DATA_DIR,
    pbUrl,
  }
}

export function getMissingReviewEnv() {
  return getMissingEnv(["PB_ADMIN_EMAIL", "PB_ADMIN_PASSWORD"])
}

export function assertLocalHttpUrl(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid local URL, got: ${value}`)
  }

  if (url.protocol !== "http:" || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `${label} must use http://localhost, http://127.0.0.1, or http://[::1]. Refusing: ${value}`,
    )
  }
}

export function isLocalHttpUrl(value) {
  try {
    assertLocalHttpUrl(value, "URL")
    return true
  } catch {
    return false
  }
}

export async function waitForHttpOk(url, { label = url, timeoutMs = 30_000 } = {}) {
  const startedAt = Date.now()
  let lastError = ""

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" })
      if (response.status >= 200 && response.status < 500) {
        return response
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    await sleep(500)
  }

  throw new Error(`Timed out waiting for ${label}${lastError ? ` (${lastError})` : ""}.`)
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withAllowedOrigin(value, originHost) {
  const origins = new Set(
    (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  )
  origins.add(originHost)

  return [...origins].join(",")
}
