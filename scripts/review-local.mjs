#!/usr/bin/env node

import { spawn } from "node:child_process"
import process from "node:process"

import { SAMPLE_USER_PASSWORD, SAMPLE_USERS } from "./seed-dev.mjs"
import {
  getMissingReviewEnv,
  loadReviewEnv,
  sleep,
  waitForHttpOk,
} from "./review-env.mjs"

function parseArgs(argv) {
  return {
    help: argv.includes("--help") || argv.includes("-h"),
    noSeed: argv.includes("--no-seed"),
  }
}

function printHelp() {
  console.log(`Usage:
  npm run review:local
  npm run review:local -- --no-seed

Starts a local-only PR review stack:
  - PocketBase on SPIN500_REVIEW_PB_URL or http://127.0.0.1:8092
  - PocketBase data in SPIN500_REVIEW_PB_DATA_DIR or tmp/pb_review_data
  - Next.js on SPIN500_REVIEW_APP_URL or http://localhost:3000
  - Dev login enabled for localhost only

Required environment:
  PB_ADMIN_EMAIL
  PB_ADMIN_PASSWORD`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const reviewEnv = loadReviewEnv()
  const missingEnv = getMissingReviewEnv()
  if (missingEnv.length > 0) {
    throw new Error(`Missing local review environment variable(s): ${missingEnv.join(", ")}`)
  }

  console.log("Starting local PR review stack...")
  console.log(`- App: ${reviewEnv.appUrl}`)
  console.log(`- PocketBase: ${reviewEnv.pbUrl}`)
  console.log(`- PocketBase data: ${reviewEnv.pbDataDir}`)

  const devProcess = spawn(process.execPath, ["scripts/dev-local.mjs"], {
    env: process.env,
    stdio: "inherit",
  })

  let shuttingDown = false
  const shutdown = () => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    devProcess.kill("SIGTERM")
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  try {
    await waitForHttpOk(new URL("/api/health", reviewEnv.pbUrl).href, {
      label: "local PocketBase health",
      timeoutMs: 30_000,
    })

    if (!options.noSeed) {
      await seedReviewDataWithRetry()
    }

    await waitForHttpOk(new URL("/auth", reviewEnv.appUrl).href, {
      label: "local Next.js app",
      timeoutMs: 45_000,
    })

    await run(process.execPath, ["scripts/review-check.mjs"])

    console.log("")
    console.log("Ready for PR review screenshots.")
    console.log(`- Sample login: ${SAMPLE_USERS[0].email} / ${SAMPLE_USER_PASSWORD}`)
    console.log(`- Dev login: ${new URL("/api/dev/login?user=maya", reviewEnv.appUrl).href}`)
    console.log("")
  } catch (error) {
    shutdown()
    throw error
  }

  const exitCode = await new Promise((resolve) => {
    devProcess.on("exit", (code) => resolve(code ?? 0))
  })

  process.exitCode = exitCode
}

async function seedReviewDataWithRetry() {
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await run(process.execPath, ["scripts/seed-dev.mjs"])
      return
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }

      console.log(`Seed was not ready yet; retrying (${attempt + 1}/${maxAttempts})...`)
      await sleep(1_000)
    }
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: "inherit",
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}.`))
    })
  })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
