#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const DATA_JSON = path.resolve("data/rs500-albums.json")
const DATA_CSV = path.resolve("data/rs500-albums.csv")
const USER_AGENT = "Spin500Reviews/0.1 (https://github.com/jaydreyer/RS500)"
const REQUEST_TIMEOUT_MS = 12000
const MUSICBRAINZ_DELAY_MS = 1100
const MAX_REVIEW_LINKS = 8

const SOURCE_LABELS = new Map([
  ["allmusic.com", "AllMusic"],
  ["albumoftheyear.org", "Album of the Year"],
  ["bbc.co.uk", "BBC Music"],
  ["consequence.net", "Consequence"],
  ["ew.com", "Entertainment Weekly"],
  ["laut.de", "laut.de"],
  ["metacritic.com", "Metacritic"],
  ["nme.com", "NME"],
  ["pastemagazine.com", "Paste"],
  ["pitchfork.com", "Pitchfork"],
  ["popmatters.com", "PopMatters"],
  ["rollingstone.com", "Rolling Stone"],
  ["rollingstone.de", "Rolling Stone Germany"],
  ["slantmagazine.com", "Slant"],
  ["sputnikmusic.com", "Sputnikmusic"],
  ["theguardian.com", "The Guardian"],
])

const SOURCE_PRIORITY = [
  "AllMusic",
  "Metacritic",
  "Pitchfork",
  "Rolling Stone",
  "BBC Music",
  "NME",
  "Entertainment Weekly",
  "Album of the Year",
]

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    limit: null,
    startRank: 1,
    endRank: 500,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") {
      options.dryRun = true
    } else if (arg === "--force") {
      options.force = true
    } else if (arg === "--limit") {
      options.limit = Number(argv[index + 1])
      index += 1
    } else if (arg === "--start-rank") {
      options.startRank = Number(argv[index + 1])
      index += 1
    } else if (arg === "--end-rank") {
      options.endRank = Number(argv[index + 1])
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      options.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  node scripts/enrich-review-links.mjs
  node scripts/enrich-review-links.mjs --dry-run --limit 20
  node scripts/enrich-review-links.mjs --force --start-rank 1 --end-rank 100

Review links are sourced from MusicBrainz release-group URL relationships.
MusicBrainz requires a meaningful User-Agent and at most one request per second.

Options:
  --dry-run       Do not write data files
  --force         Re-check albums that already have review links
  --limit N       Process at most N matching albums
  --start-rank N  First rank to process
  --end-rank N    Last rank to process`)
}

function csvEscape(value) {
  const stringValue = String(value ?? "")
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }

  return stringValue
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url, options = {}) {
  const maxAttempts = options.maxAttempts ?? 4
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...(options.headers ?? {}),
        },
      })

      if (response.ok) {
        return response.json()
      }

      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Failed ${url}: ${response.status} ${response.statusText}`)
      }

      if (attempt === maxAttempts) {
        throw new Error(`Failed ${url}: ${response.status} ${response.statusText}`)
      }

      const retryAfter = Number(response.headers.get("retry-after"))
      const waitMs = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : MUSICBRAINZ_DELAY_MS * attempt
      await sleep(waitMs)
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }
      await sleep(MUSICBRAINZ_DELAY_MS * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`Failed ${url}`)
}

function getMusicBrainzReleaseGroupId(album) {
  return album.external_ids?.musicbrainz_release_group ?? ""
}

function getHost(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return ""
  }
}

function getSourceLabel(url) {
  const host = getHost(url)
  if (!host) {
    return ""
  }

  for (const [domain, label] of SOURCE_LABELS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return label
    }
  }

  return host
    .split(".")
    .filter((part) => !["com", "co", "net", "org", "uk"].includes(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function isReviewLikeRelation(relation) {
  const type = String(relation.type ?? "").toLowerCase()
  const url = relation.url?.resource ?? ""
  const host = getHost(url)

  return (
    type === "review" ||
    type === "allmusic" ||
    SOURCE_LABELS.has(host) ||
    Array.from(SOURCE_LABELS.keys()).some((domain) => host.endsWith(`.${domain}`))
  )
}

function normalizeReviewLinks(relations) {
  const bySource = new Map()

  for (const relation of relations ?? []) {
    if (!isReviewLikeRelation(relation)) {
      continue
    }

    const url = relation.url?.resource ?? ""
    const source = getSourceLabel(url)
    if (!source || !url) {
      continue
    }

    const kind = relation.type === "allmusic" || relation.type === "other databases"
      ? "reference"
      : "review"
    const existing = bySource.get(source)
    if (!existing || getLinkPriority({ source, kind }) < getLinkPriority(existing)) {
      bySource.set(source, { source, url, kind })
    }
  }

  return Array.from(bySource.values())
    .sort((left, right) => getLinkPriority(left) - getLinkPriority(right))
    .slice(0, MAX_REVIEW_LINKS)
}

function getLinkPriority(link) {
  const sourceIndex = SOURCE_PRIORITY.indexOf(link.source)
  const sourcePriority = sourceIndex === -1 ? SOURCE_PRIORITY.length : sourceIndex
  return sourcePriority * 10 + (link.kind === "review" ? 0 : 1)
}

async function fetchReviewLinks(album) {
  const releaseGroupId = getMusicBrainzReleaseGroupId(album)
  if (!releaseGroupId) {
    return []
  }

  const url = `https://musicbrainz.org/ws/2/release-group/${releaseGroupId}?inc=url-rels&fmt=json`
  const releaseGroup = await fetchJson(url)
  return normalizeReviewLinks(releaseGroup.relations)
}

async function writeDataFiles(data) {
  data.source.generatedAt = new Date().toISOString()
  data.source.reviewLinks =
    "MusicBrainz release-group URL relationships with review/reference sources"

  await fs.writeFile(DATA_JSON, `${JSON.stringify(data, null, 2)}\n`)

  const csvRows = [
    [
      "rank",
      "title",
      "artist",
      "year",
      "cover_url",
      "spotify_url",
      "apple_music_url",
      "review_links",
      "external_ids",
    ],
    ...data.albums.map((row) => [
      row.rank,
      row.title,
      row.artist,
      row.year,
      row.cover_url,
      row.spotify_url,
      row.apple_music_url,
      JSON.stringify(row.review_links ?? []),
      JSON.stringify(row.external_ids),
    ]),
  ]
  await fs.writeFile(
    DATA_CSV,
    `${csvRows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  )
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const data = JSON.parse(await fs.readFile(DATA_JSON, "utf8"))
  const albums = data.albums
    .filter((album) => album.rank >= options.startRank && album.rank <= options.endRank)
    .filter((album) => options.force || !Array.isArray(album.review_links) || album.review_links.length === 0)
    .slice(0, options.limit ?? undefined)

  for (const [index, album] of albums.entries()) {
    if (index > 0) {
      await sleep(MUSICBRAINZ_DELAY_MS)
    }

    const links = await fetchReviewLinks(album)
    album.review_links = links
    console.log(
      `#${String(album.rank).padStart(3, "0")} ${album.artist} - ${album.title}: ${links.length} link(s)`,
    )
  }

  const linkedCount = data.albums.filter(
    (album) => Array.isArray(album.review_links) && album.review_links.length > 0,
  ).length
  console.log(`Review/reference links: ${linkedCount}/500 albums`)

  if (options.dryRun) {
    console.log("Dry run: no files written.")
    return
  }

  await writeDataFiles(data)
  console.log(`Wrote ${DATA_JSON}`)
  console.log(`Wrote ${DATA_CSV}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
