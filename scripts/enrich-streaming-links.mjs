#!/usr/bin/env node

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import process from "node:process"

const DATA_JSON = path.resolve("data/rs500-albums.json")
const DATA_CSV = path.resolve("data/rs500-albums.csv")
const USER_AGENT = "Spin500Links/0.1 (https://github.com/jaydreyer/RS500)"
const REQUEST_TIMEOUT_MS = 12000
const APPLE_MIN_SCORE = 72
const SPOTIFY_MIN_SCORE = 70
const APPLE_DELAY_MS = 250

function loadDotenvFile(filePath) {
  if (!fsSync.existsSync(filePath)) {
    return
  }

  const lines = fsSync.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }

    process.env[key] = rawValue.replace(/^["']|["']$/g, "")
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: null,
    startRank: 1,
    endRank: 500,
    useOdesli: false,
    spotifySearchFallback: false,
    force: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") {
      options.dryRun = true
    } else if (arg === "--force") {
      options.force = true
    } else if (arg === "--odesli") {
      options.useOdesli = true
    } else if (arg === "--spotify-search-fallback") {
      options.spotifySearchFallback = true
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
  node scripts/enrich-streaming-links.mjs
  node scripts/enrich-streaming-links.mjs --dry-run --limit 20
  node scripts/enrich-streaming-links.mjs --force --odesli

Apple Music links use Apple's public Search API.

Optional Spotify environment:
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET

Options:
  --dry-run       Do not write data files
  --force         Re-check albums that already have links
  --odesli        Try Songlink/Odesli cross-link lookup from Apple Music URLs
  --spotify-search-fallback
                  Fill missing Spotify URLs with Spotify album search links
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

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\bdeluxe\b|\bexpanded\b|\bremaster(?:ed)?\b|\banniversary\b|\bedition\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
}

function tokenSet(value) {
  return new Set(normalize(value).split(/\s+/).filter(Boolean))
}

function overlapScore(left, right) {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0
  }

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size)
}

function yearFromDate(value) {
  const year = String(value ?? "").slice(0, 4)
  return /^\d{4}$/.test(year) ? Number(year) : null
}

function scoreCandidate(album, candidate) {
  const title = candidate.title
  const artist = candidate.artist
  const year = candidate.year
  const normalizedAlbumTitle = normalize(album.title)
  const normalizedCandidateTitle = normalize(title)
  const normalizedAlbumArtist = normalize(album.artist)
  const normalizedCandidateArtist = normalize(artist)

  let score = 0
  if (normalizedAlbumTitle === normalizedCandidateTitle) {
    score += 60
  } else if (
    normalizedCandidateTitle.includes(normalizedAlbumTitle) ||
    normalizedAlbumTitle.includes(normalizedCandidateTitle)
  ) {
    score += 46
  } else {
    score += Math.round(overlapScore(album.title, title) * 42)
  }

  if (normalizedAlbumArtist === normalizedCandidateArtist) {
    score += 30
  } else if (
    normalizedCandidateArtist.includes(normalizedAlbumArtist) ||
    normalizedAlbumArtist.includes(normalizedCandidateArtist)
  ) {
    score += 23
  } else {
    score += Math.round(overlapScore(album.artist, artist) * 24)
  }

  if (year) {
    const delta = Math.abs(Number(album.year) - year)
    if (delta === 0) {
      score += 12
    } else if (delta <= 1) {
      score += 8
    } else if (delta <= 3) {
      score += 4
    }
  }

  const noisyCandidate = /\b(deluxe|expanded|anniversary|remaster|edition)\b/i.test(title)
  const noisyAlbum = /\b(deluxe|expanded|anniversary|remaster|edition)\b/i.test(album.title)
  if (noisyCandidate && !noisyAlbum) {
    score -= 8
  }

  return score
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
        : 800 * attempt * attempt
      await sleep(waitMs)
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }
      await sleep(800 * attempt * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`Failed ${url}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function cleanUrl(value) {
  if (!value) {
    return ""
  }

  const url = new URL(value)
  for (const key of Array.from(url.searchParams.keys())) {
    if (!["app", "ls", "mt"].includes(key)) {
      url.searchParams.delete(key)
    }
  }
  return url.toString()
}

async function findAppleAlbum(album) {
  const term = encodeURIComponent(`${album.artist} ${album.title}`)
  const url = `https://itunes.apple.com/search?term=${term}&entity=album&country=US&limit=12`
  const json = await fetchJson(url)
  const candidates = (json.results ?? [])
    .map((result) => ({
      title: result.collectionName,
      artist: result.artistName,
      year: yearFromDate(result.releaseDate),
      url: result.collectionViewUrl,
      score: scoreCandidate(album, {
        title: result.collectionName,
        artist: result.artistName,
        year: yearFromDate(result.releaseDate),
      }),
    }))
    .filter((candidate) => candidate.url)
    .sort((left, right) => right.score - left.score)

  const best = candidates[0]
  if (!best || best.score < APPLE_MIN_SCORE) {
    return { url: "", score: best?.score ?? 0, candidates }
  }

  return { url: cleanUrl(best.url), score: best.score, candidates }
}

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return ""
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" })
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const json = await fetchJson("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  return json.access_token ?? ""
}

async function findSpotifyAlbum(album, token) {
  if (!token) {
    return { url: "", score: 0, candidates: [] }
  }

  const query = encodeURIComponent(`album:${album.title} artist:${album.artist}`)
  const json = await fetchJson(
    `https://api.spotify.com/v1/search?q=${query}&type=album&market=US&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  const candidates = (json.albums?.items ?? [])
    .map((result) => ({
      title: result.name,
      artist: (result.artists ?? []).map((artist) => artist.name).join(" "),
      year: yearFromDate(result.release_date),
      url: result.external_urls?.spotify,
      albumType: result.album_type,
      score:
        scoreCandidate(album, {
          title: result.name,
          artist: (result.artists ?? []).map((artist) => artist.name).join(" "),
          year: yearFromDate(result.release_date),
        }) + (result.album_type === "album" ? 4 : -6),
    }))
    .filter((candidate) => candidate.url)
    .sort((left, right) => right.score - left.score)

  const best = candidates[0]
  if (!best || best.score < SPOTIFY_MIN_SCORE) {
    return { url: "", score: best?.score ?? 0, candidates }
  }

  return { url: best.url, score: best.score, candidates }
}

async function findOdesliSpotifyUrl(appleUrl) {
  if (!appleUrl) {
    return ""
  }

  const json = await fetchJson(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(appleUrl)}&userCountry=US`,
  )
  return json.linksByPlatform?.spotify?.url ?? ""
}

function buildSpotifyAlbumSearchUrl(album) {
  const query = encodeURIComponent(`${album.artist} ${album.title} album`)
  return `https://open.spotify.com/search/${query}/albums`
}

async function main() {
  loadDotenvFile(path.resolve(".env.local"))
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const data = JSON.parse(await fs.readFile(DATA_JSON, "utf8"))
  const spotifyToken = await getSpotifyToken()
  const albums = data.albums
    .filter((album) => album.rank >= options.startRank && album.rank <= options.endRank)
    .filter((album) => options.force || !album.apple_music_url || !album.spotify_url)
    .slice(0, options.limit ?? undefined)

  const report = []
  for (const album of albums) {
    const needsApple = options.force || !album.apple_music_url
    const needsSpotify = options.force || !album.spotify_url
    let apple = { url: album.apple_music_url, score: 0, candidates: [] }
    let spotify = { url: album.spotify_url, score: 0, candidates: [] }

    if (needsApple) {
      await sleep(APPLE_DELAY_MS)
      apple = await findAppleAlbum(album)
      if (apple.url) {
        album.apple_music_url = apple.url
      }
    }

    if (needsSpotify && spotifyToken) {
      spotify = await findSpotifyAlbum(album, spotifyToken)
      if (spotify.url) {
        album.spotify_url = spotify.url
      }
    }

    if (needsSpotify && !album.spotify_url && options.useOdesli && album.apple_music_url) {
      const odesliSpotifyUrl = await findOdesliSpotifyUrl(album.apple_music_url)
      if (odesliSpotifyUrl) {
        album.spotify_url = odesliSpotifyUrl
        spotify = { url: odesliSpotifyUrl, score: 0, candidates: [] }
      }
    }

    if (needsSpotify && !album.spotify_url && options.spotifySearchFallback) {
      album.spotify_url = buildSpotifyAlbumSearchUrl(album)
      spotify = { url: album.spotify_url, score: 0, candidates: [] }
    }

    report.push({
      rank: album.rank,
      title: album.title,
      artist: album.artist,
      apple: album.apple_music_url ? "ok" : "missing",
      appleScore: apple.score,
      spotify: album.spotify_url ? "ok" : "missing",
      spotifyScore: spotify.score,
    })

    console.log(
      `#${String(album.rank).padStart(3, "0")} ${album.artist} - ${album.title}: Apple ${
        album.apple_music_url ? "ok" : "missing"
      }${
        spotifyToken || options.useOdesli || options.spotifySearchFallback
          ? ` / Spotify ${album.spotify_url ? "ok" : "missing"}`
          : ""
      }`,
    )
  }

  const appleCount = data.albums.filter((album) => album.apple_music_url).length
  const spotifyCount = data.albums.filter((album) => album.spotify_url).length
  const missingApple = report.filter((row) => row.apple === "missing")
  const missingSpotify = report.filter((row) => row.spotify === "missing")

  console.log(`Apple Music links: ${appleCount}/500`)
  console.log(`Spotify links: ${spotifyCount}/500`)
  if (missingApple.length > 0) {
    console.log(`Missing Apple Music ranks: ${missingApple.map((row) => row.rank).join(", ")}`)
  }
  if ((spotifyToken || options.useOdesli || options.spotifySearchFallback) && missingSpotify.length > 0) {
    console.log(`Missing Spotify ranks: ${missingSpotify.map((row) => row.rank).join(", ")}`)
  }
  if (!spotifyToken && !options.useOdesli && !options.spotifySearchFallback) {
    console.log(
      "Spotify skipped: set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET, pass --odesli, or pass --spotify-search-fallback.",
    )
  }

  if (options.dryRun) {
    console.log("Dry run: no files written.")
    return
  }

  data.source.generatedAt = new Date().toISOString()
  data.source.streamingLinks =
    "Apple Search API; Spotify Web API when SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET are configured; Spotify album search fallback when --spotify-search-fallback is used"
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

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
