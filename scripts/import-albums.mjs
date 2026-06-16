#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"
import { parse } from "csv-parse/sync"
import PocketBase from "pocketbase"
import { getMissingEnv, loadProjectEnv } from "./env.mjs"

const REQUIRED_FIELDS = ["rank", "title", "artist", "year", "cover_url"]
const OPTIONAL_URL_FIELDS = ["spotify_url", "apple_music_url"]
const ALL_FIELDS = [
  ...REQUIRED_FIELDS,
  ...OPTIONAL_URL_FIELDS,
  "external_ids",
  "review_links",
]

function parseArgs(argv) {
  const options = {
    dryRun: false,
    file: null,
    validateOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") {
      options.dryRun = true
    } else if (arg === "--validate-only") {
      options.validateOnly = true
    } else if (arg === "--file" || arg === "-f") {
      options.file = argv[index + 1] ?? null
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      options.help = true
    } else if (!options.file) {
      options.file = arg
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  npm run import:albums -- --file ./data/rs500.csv
  npm run import:albums -- ./data/rs500.json --dry-run
  npm run import:albums -- ./data/rs500.csv --validate-only

Required environment:
  NEXT_PUBLIC_PB_URL
  PB_ADMIN_EMAIL
  PB_ADMIN_PASSWORD

Environment is read from the shell, then .env.local/.env in this checkout,
then .env.local/.env in the primary Git checkout for Codex worktrees.`)
}

function normalizeHeader(header) {
  return String(header).trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function readRows(filePath) {
  const absolutePath = path.resolve(filePath)
  const ext = path.extname(absolutePath).toLowerCase()
  const contents = fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "")

  if (ext === ".json") {
    const parsed = JSON.parse(contents)
    const rows = Array.isArray(parsed) ? parsed : parsed.albums
    if (!Array.isArray(rows)) {
      throw new Error("JSON seed must be an array or an object with an albums array.")
    }

    return rows.map((row, index) => ({
      rowNumber: index + 1,
      raw: normalizeObjectKeys(row),
    }))
  }

  if (ext === ".csv") {
    const records = parse(contents, {
      columns: (headers) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
    })

    return records.map((row, index) => ({
      rowNumber: index + 2,
      raw: normalizeObjectKeys(row),
    }))
  }

  throw new Error("Seed file must end in .csv or .json.")
}

function normalizeObjectKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [normalizeHeader(key), item]),
  )
}

function asTrimmedString(value) {
  if (value === undefined || value === null) {
    return ""
  }

  return String(value).trim()
}

function parseInteger(value, fieldName) {
  const stringValue = asTrimmedString(value)
  if (!/^-?\d+$/.test(stringValue)) {
    throw new Error(`${fieldName} must be an integer`)
  }

  return Number.parseInt(stringValue, 10)
}

function requireHttpUrl(value, fieldName) {
  const stringValue = asTrimmedString(value)
  if (!stringValue) {
    return ""
  }

  let parsed
  try {
    parsed = new URL(stringValue)
  } catch {
    throw new Error(`${fieldName} must be a valid URL`)
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${fieldName} must use http or https`)
  }

  return stringValue
}

function parseExternalIds(value) {
  if (value === undefined || value === null || asTrimmedString(value) === "") {
    return null
  }

  if (typeof value === "object") {
    return value
  }

  try {
    return JSON.parse(String(value))
  } catch {
    throw new Error("external_ids must be valid JSON when provided")
  }
}

export function parseReviewLinks(value) {
  if (value === undefined || value === null || asTrimmedString(value) === "") {
    return []
  }

  let parsed = value
  if (typeof value !== "object") {
    try {
      parsed = JSON.parse(String(value))
    } catch {
      throw new Error("review_links must be valid JSON when provided")
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("review_links must be a JSON array")
  }

  return parsed.map((link, index) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw new Error(`review_links[${index}] must be an object`)
    }

    const source = asTrimmedString(link.source)
    const url = requireHttpUrl(link.url, `review_links[${index}].url`)
    const kind = asTrimmedString(link.kind) || "review"

    if (!source) {
      throw new Error(`review_links[${index}].source is required`)
    }

    return { source, url, kind }
  })
}

export function normalizeAlbum(row) {
  const missing = REQUIRED_FIELDS.filter((field) => asTrimmedString(row[field]) === "")
  if (missing.length > 0) {
    throw new Error(`missing required field(s): ${missing.join(", ")}`)
  }

  const rank = parseInteger(row.rank, "rank")
  if (rank < 1 || rank > 500) {
    throw new Error("rank must be between 1 and 500")
  }

  const year = parseInteger(row.year, "year")
  if (year < 1800 || year > 2100) {
    throw new Error("year must be between 1800 and 2100")
  }

  const album = {
    rank,
    title: asTrimmedString(row.title),
    artist: asTrimmedString(row.artist),
    year,
    cover_url: requireHttpUrl(row.cover_url, "cover_url"),
    spotify_url: requireHttpUrl(row.spotify_url, "spotify_url"),
    apple_music_url: requireHttpUrl(row.apple_music_url, "apple_music_url"),
    external_ids: parseExternalIds(row.external_ids),
    review_links: parseReviewLinks(row.review_links),
  }

  if (!album.cover_url) {
    throw new Error("missing required field: cover_url")
  }

  return album
}

function titleArtistKey(album) {
  return `${album.title.toLowerCase().replace(/\s+/g, " ").trim()}|||${album.artist
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()}`
}

function equalJson(left, right) {
  return stableJsonStringify(left ?? null) === stableJsonStringify(right ?? null)
}

function stableJsonStringify(value) {
  return JSON.stringify(sortJsonKeys(value))
}

function sortJsonKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonKeys(item))
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJsonKeys(value[key])]),
  )
}

export function hasAlbumChanges(existing, nextAlbum) {
  return ALL_FIELDS.some((field) => {
    if (field === "external_ids" || field === "review_links") {
      return !equalJson(existing[field], nextAlbum[field])
    }

    if (field === "rank" || field === "year") {
      return Number(existing[field]) !== nextAlbum[field]
    }

    return asTrimmedString(existing[field]) !== asTrimmedString(nextAlbum[field])
  })
}

export function summarizeDuplicateTitleArtists(validRows) {
  const groups = new Map()

  for (const row of validRows) {
    const key = titleArtistKey(row.album)
    const existing = groups.get(key) ?? []
    existing.push(row)
    groups.set(key, existing)
  }

  return Array.from(groups.values()).filter((group) => group.length > 1)
}

function printDuplicateSummary(groups) {
  if (groups.length === 0) {
    console.log("Possible duplicate (title, artist) rows: none")
    return
  }

  console.log("Possible duplicate (title, artist) rows:")
  for (const group of groups) {
    const { title, artist } = group[0].album
    const locations = group
      .map((row) => `row ${row.rowNumber} / rank ${row.album.rank}`)
      .join("; ")
    console.log(`- ${title} - ${artist}: ${locations}`)
  }
}

function printSummary(summary, label) {
  console.log("")
  console.log(`Album import summary${label ? ` (${label})` : ""}:`)
  console.log(`- Created: ${summary.created}`)
  console.log(`- Updated: ${summary.updated}`)
  console.log(`- Skipped: ${summary.skipped}`)
  console.log(`- Failed: ${summary.failed}`)
}

function printFailedRows(failedRows) {
  if (failedRows.length === 0) {
    return
  }

  console.log("")
  console.log("Failed rows:")
  for (const row of failedRows) {
    console.log(`- Row ${row.rowNumber}: ${row.reason}`)
  }
}

function isNotFound(error) {
  return error?.status === 404 || error?.response?.status === 404
}

function formatPocketBaseError(error) {
  const data = error?.data?.data ?? error?.response?.data?.data
  if (!data || typeof data !== "object") {
    return error?.message ?? String(error)
  }

  const details = Object.entries(data)
    .map(([field, detail]) => `${field}: ${detail.message ?? JSON.stringify(detail)}`)
    .join("; ")

  return `${error?.message ?? "PocketBase error"} (${details})`
}

async function findAlbumByRank(pb, rank) {
  try {
    return await pb.collection("albums").getFirstListItem(pb.filter("rank = {:rank}", { rank }), {
      requestKey: null,
    })
  } catch (error) {
    if (isNotFound(error)) {
      return null
    }

    throw error
  }
}

async function upsertAlbum(pb, album, dryRun) {
  const existing = await findAlbumByRank(pb, album.rank)

  if (!existing) {
    if (!dryRun) {
      await pb.collection("albums").create(album, { requestKey: null })
    }

    return "created"
  }

  if (!hasAlbumChanges(existing, album)) {
    return "skipped"
  }

  if (!dryRun) {
    await pb.collection("albums").update(existing.id, album, { requestKey: null })
  }

  return "updated"
}

async function main() {
  loadProjectEnv()

  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  if (!options.file) {
    printHelp()
    throw new Error("Missing seed file path.")
  }

  const parsedRows = readRows(options.file)
  const validRows = []
  const failedRows = []
  const seenRanks = new Map()

  for (const row of parsedRows) {
    try {
      const album = normalizeAlbum(row.raw)
      const previousRankRow = seenRanks.get(album.rank)
      if (previousRankRow) {
        throw new Error(`duplicate rank ${album.rank}; first seen on row ${previousRankRow}`)
      }

      seenRanks.set(album.rank, row.rowNumber)
      validRows.push({ ...row, album })
    } catch (error) {
      failedRows.push({
        rowNumber: row.rowNumber,
        reason: error.message,
      })
    }
  }

  printDuplicateSummary(summarizeDuplicateTitleArtists(validRows))

  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: failedRows.length,
  }

  if (options.validateOnly) {
    summary.skipped = validRows.length
    printSummary(summary, "validate only")
    printFailedRows(failedRows)
    if (failedRows.length > 0) {
      process.exitCode = 1
    }
    return
  }

  const pbUrl = process.env.NEXT_PUBLIC_PB_URL
  const adminEmail = process.env.PB_ADMIN_EMAIL
  const adminPassword = process.env.PB_ADMIN_PASSWORD

  const missingEnv = getMissingEnv(["NEXT_PUBLIC_PB_URL", "PB_ADMIN_EMAIL", "PB_ADMIN_PASSWORD"])

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missingEnv.join(", ")}. Checked the shell plus .env.local/.env in this checkout and the primary Git checkout.`,
    )
  }

  const pb = new PocketBase(pbUrl)
  pb.autoCancellation(false)

  await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword)

  for (const row of validRows) {
    try {
      const result = await upsertAlbum(pb, row.album, options.dryRun)
      summary[result] += 1
    } catch (error) {
      summary.failed += 1
      failedRows.push({
        rowNumber: row.rowNumber,
        reason: formatPocketBaseError(error),
      })
    }
  }

  printSummary(summary, options.dryRun ? "dry run" : "")

  if (failedRows.length > 0) {
    printFailedRows(failedRows)
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
