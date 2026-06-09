#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"

const SERIES_ID = "6a4b53b9-2756-4afe-93f2-306039d41910"
const USER_AGENT = "Spin500Seed/0.1 (https://github.com/jaydreyer/RS500)"
const SERIES_URL = `https://musicbrainz.org/ws/2/series/${SERIES_ID}?fmt=json&inc=release-group-rels+artist-credits`
const OUTPUT_DIR = path.resolve("data")
const OUTPUT_JSON = path.join(OUTPUT_DIR, "rs500-albums.json")
const OUTPUT_CSV = path.join(OUTPUT_DIR, "rs500-albums.csv")
const COVER_CHECK_JSON = path.join(OUTPUT_DIR, "rs500-cover-check.json")
const REQUEST_TIMEOUT_MS = 10000
const COVER_CHECK_CONCURRENCY = 12
const COVER_URL_OVERRIDES = new Map([
  [
    "7c4cab8d-dead-3870-b501-93c90fd0a580",
    "https://coverartarchive.org/release/299d12ca-adee-4730-80df-61f4be276754/front-500",
  ],
  [
    "116b94a2-4361-3ec2-af92-270d97dc10f9",
    "https://coverartarchive.org/release/826dea98-e427-351e-a692-adc00a74f5a0/front-500",
  ],
])

function csvEscape(value) {
  const stringValue = String(value ?? "")
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }

  return stringValue
}

function artistCreditToString(artistCredit = []) {
  return artistCredit.map((credit) => `${credit.name ?? ""}${credit.joinphrase ?? ""}`).join("")
}

function getYear(firstReleaseDate) {
  const year = String(firstReleaseDate ?? "").slice(0, 4)
  return /^\d{4}$/.test(year) ? Number(year) : 0
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  })
  clearTimeout(timeout)

  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function coverExists(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
      },
    })

    return response.status >= 200 && response.status < 400
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const series = await fetchJson(SERIES_URL)
  const rows = series.relations
    .filter((relation) => relation["target-type"] === "release_group" && relation.release_group)
    .map((relation) => {
      const releaseGroup = relation.release_group
      const rank = Number(relation["attribute-values"]?.number ?? relation["ordering-key"])
      const musicbrainzReleaseGroupId = releaseGroup.id

      return {
        rank,
        title: releaseGroup.title,
        artist: artistCreditToString(releaseGroup["artist-credit"]),
        year: getYear(releaseGroup["first-release-date"]),
        cover_url:
          COVER_URL_OVERRIDES.get(musicbrainzReleaseGroupId) ??
          `https://coverartarchive.org/release-group/${musicbrainzReleaseGroupId}/front-500`,
        spotify_url: "",
        apple_music_url: "",
        review_links: [],
        external_ids: {
          musicbrainz_release_group: musicbrainzReleaseGroupId,
          musicbrainz_series: SERIES_ID,
        },
      }
    })
    .sort((a, b) => a.rank - b.rank)

  const ranks = new Set(rows.map((row) => row.rank))
  const missingRanks = Array.from({ length: 500 }, (_, index) => index + 1).filter(
    (rank) => !ranks.has(rank),
  )
  if (rows.length !== 500 || missingRanks.length > 0) {
    throw new Error(
      `Expected 500 ranked albums, got ${rows.length}. Missing ranks: ${missingRanks.join(", ")}`,
    )
  }

  const missingRequired = rows.filter(
    (row) => !row.rank || !row.title || !row.artist || !row.year || !row.cover_url,
  )
  if (missingRequired.length > 0) {
    throw new Error(
      `Rows missing required fields: ${missingRequired.map((row) => row.rank).join(", ")}`,
    )
  }

  const coverChecks = await mapWithConcurrency(rows, COVER_CHECK_CONCURRENCY, async (row) => {
    const ok = await coverExists(row.cover_url)
    return {
      rank: row.rank,
      title: row.title,
      artist: row.artist,
      ok,
      cover_url: row.cover_url,
    }
  })

  const missingCovers = coverChecks.filter((check) => !check.ok)
  if (missingCovers.length > 0) {
    await fs.writeFile(COVER_CHECK_JSON, `${JSON.stringify(coverChecks, null, 2)}\n`)
    throw new Error(
      `Cover Art Archive missing covers for ranks: ${missingCovers
        .map((check) => check.rank)
        .join(", ")}`,
    )
  }

  const output = {
    source: {
      name: "MusicBrainz release-group series: Rolling Stone: 500 Greatest Albums of All Time: 2020 edition",
      url: `https://musicbrainz.org/series/${SERIES_ID}`,
      coverArt: "Cover Art Archive release-group front-500 endpoints",
      generatedAt: new Date().toISOString(),
    },
    albums: rows,
  }
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`)

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
    ...rows.map((row) => [
      row.rank,
      row.title,
      row.artist,
      row.year,
      row.cover_url,
      row.spotify_url,
      row.apple_music_url,
      JSON.stringify(row.review_links),
      JSON.stringify(row.external_ids),
    ]),
  ]
  await fs.writeFile(
    OUTPUT_CSV,
    `${csvRows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  )
  await fs.writeFile(COVER_CHECK_JSON, `${JSON.stringify(coverChecks, null, 2)}\n`)

  console.log(`Wrote ${OUTPUT_JSON}`)
  console.log(`Wrote ${OUTPUT_CSV}`)
  console.log(`Verified ${coverChecks.length} cover URLs`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
