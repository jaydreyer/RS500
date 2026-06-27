#!/usr/bin/env node

import process from "node:process"

import PocketBase from "pocketbase"

import { SAMPLE_USER_PASSWORD, SAMPLE_USERS } from "./seed-dev.mjs"
import {
  getMissingReviewEnv,
  loadReviewEnv,
  waitForHttpOk,
} from "./review-env.mjs"

async function main() {
  const { appUrl, pbUrl } = loadReviewEnv()
  const missingEnv = getMissingReviewEnv()

  if (missingEnv.length > 0) {
    throw new Error(`Missing local review environment variable(s): ${missingEnv.join(", ")}`)
  }

  await waitForHttpOk(new URL("/api/health", pbUrl).href, {
    label: "local PocketBase health",
    timeoutMs: 10_000,
  })

  await assertSampleLogin(pbUrl)

  await waitForHttpOk(new URL("/auth", appUrl).href, {
    label: "local Next.js app",
    timeoutMs: 20_000,
  })

  await assertDevLogin(appUrl)

  console.log("")
  console.log("Local PR review stack is ready.")
  console.log(`- App: ${appUrl}`)
  console.log(`- PocketBase: ${pbUrl}`)
  console.log(`- Sample login: ${SAMPLE_USERS[0].email} / ${SAMPLE_USER_PASSWORD}`)
  console.log(`- Dev login: ${new URL("/api/dev/login?user=maya", appUrl).href}`)
}

async function assertSampleLogin(pbUrl) {
  const pb = new PocketBase(pbUrl)
  pb.autoCancellation(false)

  await pb.collection("users").authWithPassword(SAMPLE_USERS[0].email, SAMPLE_USER_PASSWORD, {
    requestKey: null,
  })
}

async function assertDevLogin(appUrl) {
  const response = await fetch(new URL("/api/dev/login?user=maya&next=/pick", appUrl), {
    redirect: "manual",
  })
  const setCookie = response.headers.get("set-cookie") || ""

  if (![302, 303, 307, 308].includes(response.status) || !setCookie.includes("pb_auth=")) {
    throw new Error(
      `Local dev login is not ready. Expected a redirect with pb_auth, got HTTP ${response.status}.`,
    )
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
