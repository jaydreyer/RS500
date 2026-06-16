#!/usr/bin/env node

import { execFile, execFileSync, spawn } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import process from "node:process"

import { getMissingEnv, loadProjectEnv } from "./env.mjs"
import { assertSafeDevSeedTarget } from "./seed-dev.mjs"

const POCKETBASE_VERSION = "0.39.4"
const POCKETBASE_DIR = path.resolve("tmp/pocketbase-bin")
const POCKETBASE_BIN = path.join(POCKETBASE_DIR, "pocketbase")
const POCKETBASE_DATA_DIR = path.resolve(process.env.SPIN500_LOCAL_PB_DATA_DIR || "tmp/pb_dev_data")
const MIGRATIONS_DIR = path.resolve("pb_migrations")
const DEFAULT_LOCAL_PB_URL = "http://127.0.0.1:8090"

function parseArgs(argv) {
  return {
    checkOnly: argv.includes("--check-only"),
    help: argv.includes("--help") || argv.includes("-h"),
  }
}

function printHelp() {
  console.log(`Usage:
  npm run dev:local
  npm run dev:local -- --check-only

Starts a local PocketBase dev server from ./tmp/pb_dev_data, ensures the
configured local superuser exists, then starts Next.js with npm run dev.

Required environment:
  PB_ADMIN_EMAIL
  PB_ADMIN_PASSWORD

Optional environment:
  SPIN500_LOCAL_PB_URL=http://127.0.0.1:8090`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  loadProjectEnv()
  process.env.NEXT_PUBLIC_PB_URL = process.env.SPIN500_LOCAL_PB_URL || DEFAULT_LOCAL_PB_URL

  const missingEnv = getMissingEnv(["NEXT_PUBLIC_PB_URL", "PB_ADMIN_EMAIL", "PB_ADMIN_PASSWORD"])
  if (missingEnv.length > 0) {
    throw new Error(`Missing environment variable(s): ${missingEnv.join(", ")}`)
  }

  assertSafeDevSeedTarget(process.env.NEXT_PUBLIC_PB_URL)
  const pbUrl = new URL(process.env.NEXT_PUBLIC_PB_URL)
  const host = normalizeListenHost(pbUrl.hostname)
  const port = Number.parseInt(pbUrl.port || "8090", 10)
  const httpAddress = `${host}:${port}`
  let pocketbaseProcess = null

  if (await isPocketBaseHealthy(pbUrl)) {
    console.log(`PocketBase already running at ${pbUrl.origin}`)
  } else {
    const pocketbase = await ensurePocketBaseBinary()
    fs.mkdirSync(POCKETBASE_DATA_DIR, { recursive: true })
    pocketbaseProcess = spawn(
      pocketbase,
      [
        "serve",
        "--dir",
        POCKETBASE_DATA_DIR,
        "--migrationsDir",
        MIGRATIONS_DIR,
        "--http",
        httpAddress,
      ],
      {
        stdio: "inherit",
      },
    )
    await waitForPocketBase(pbUrl)
  }

  await upsertSuperuser()
  console.log(`PocketBase dev backend ready at ${pbUrl.origin}`)
  console.log(`Next.js will use NEXT_PUBLIC_PB_URL=${process.env.NEXT_PUBLIC_PB_URL}`)

  if (options.checkOnly) {
    if (pocketbaseProcess) {
      pocketbaseProcess.kill("SIGTERM")
    }
    return
  }

  const nextProcess = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
  })

  const shutdown = () => {
    nextProcess.kill("SIGTERM")
    if (pocketbaseProcess) {
      pocketbaseProcess.kill("SIGTERM")
    }
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  const exitCode = await new Promise((resolve) => {
    nextProcess.on("exit", (code) => resolve(code ?? 0))
  })

  if (pocketbaseProcess) {
    pocketbaseProcess.kill("SIGTERM")
  }

  process.exitCode = exitCode
}

function normalizeListenHost(hostname) {
  if (hostname === "localhost") {
    return "127.0.0.1"
  }

  return hostname === "[::1]" ? "::1" : hostname
}

async function ensurePocketBaseBinary() {
  const pathBinary = findPathBinary("pocketbase")
  if (pathBinary) {
    return pathBinary
  }

  if (fs.existsSync(POCKETBASE_BIN)) {
    return POCKETBASE_BIN
  }

  fs.mkdirSync(POCKETBASE_DIR, { recursive: true })
  const archiveName = getPocketBaseArchiveName()
  const archiveUrl = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/${archiveName}`
  const archivePath = path.join(POCKETBASE_DIR, archiveName)

  console.log(`Downloading PocketBase ${POCKETBASE_VERSION} for local development...`)
  await execFilePromise("curl", ["-fL", archiveUrl, "-o", archivePath])
  await execFilePromise("unzip", ["-oq", archivePath, "-d", POCKETBASE_DIR])
  fs.chmodSync(POCKETBASE_BIN, 0o755)

  return POCKETBASE_BIN
}

function findPathBinary(binaryName) {
  try {
    const result = execFileSync("which", [binaryName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()

    return result || ""
  } catch {
    return ""
  }
}

function getPocketBaseArchiveName() {
  const platform = os.platform()
  const arch = os.arch()
  const platformName = platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : ""
  const archName = arch === "arm64" ? "arm64" : arch === "x64" ? "amd64" : ""

  if (!platformName || !archName) {
    throw new Error(`Unsupported PocketBase download platform: ${platform}/${arch}`)
  }

  return `pocketbase_${POCKETBASE_VERSION}_${platformName}_${archName}.zip`
}

async function upsertSuperuser() {
  const pocketbase = await ensurePocketBaseBinary()
  await execFilePromise(
    pocketbase,
    [
      "superuser",
      "upsert",
      process.env.PB_ADMIN_EMAIL,
      process.env.PB_ADMIN_PASSWORD,
      "--dir",
      POCKETBASE_DATA_DIR,
      "--migrationsDir",
      MIGRATIONS_DIR,
    ],
    { stdio: "inherit" },
  )
}

async function waitForPocketBase(pbUrl) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 15_000) {
    if (await isPocketBaseHealthy(pbUrl)) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for PocketBase at ${pbUrl.origin}`)
}

async function isPocketBaseHealthy(pbUrl) {
  const healthUrl = new URL("/api/health", pbUrl)

  return new Promise((resolve) => {
    const request = http.get(healthUrl, (response) => {
      response.resume()
      resolve(response.statusCode === 200)
    })

    request.on("error", () => resolve(false))
    request.setTimeout(1000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

function execFilePromise(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (stdout) {
        process.stdout.write(stdout)
      }
      if (stderr) {
        process.stderr.write(stderr)
      }
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
