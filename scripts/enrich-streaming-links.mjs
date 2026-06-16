#!/usr/bin/env node

import fs from "node:fs/promises"
import fsSync from "node:fs"
import crypto from "node:crypto"
import path from "node:path"
import process from "node:process"
import { loadProjectEnv } from "./env.mjs"

const DATA_JSON = path.resolve("data/rs500-albums.json")
const DATA_CSV = path.resolve("data/rs500-albums.csv")
const USER_AGENT = "Spin500Links/0.1 (https://github.com/jaydreyer/RS500)"
const REQUEST_TIMEOUT_MS = 12000
const APPLE_MIN_SCORE = 72
const APPLE_MUSIC_MIN_SCORE = 72
const SPOTIFY_MIN_SCORE = 70
const APPLE_DELAY_MS = 250
const MUSICBRAINZ_DELAY_MS = 1100
const WIKIDATA_CHUNK_SIZE = 80
const SPOTIFY_ALBUM_URL_PATTERN = /^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+(?:[?#].*)?$/
const SPOTIFY_SEARCH_URL_PATTERN = /^https:\/\/open\.spotify\.com\/search\//
const SPOTIFY_DIRECT_OVERRIDES_BY_RANK = new Map([
  [25, "https://open.spotify.com/album/12n11cgnpjXKLeqrnIERoS"],
  [51, "https://open.spotify.com/album/2OF8CKhOljClqtRTZ5aILa"],
  [76, "https://open.spotify.com/album/295ykF5lEp4sZseuob1qTu"],
  [78, "https://open.spotify.com/album/5p3sGrteXqwb7aRtS6gzp6"],
  [121, "https://open.spotify.com/album/0mUFefHSr0Ovi9vNcUGppt"],
  [170, "https://open.spotify.com/album/6fRqzJT070Kp9RWlSXmKcY"],
  [174, "https://open.spotify.com/album/01Ip2FMtQwlJncHFfZPVe0"],
  [229, "https://open.spotify.com/album/1rKW8EB3mRIFqnVRo0Zcot"],
  [240, "https://open.spotify.com/album/3nTXqOEHr6AfTb1WSaB4Pm"],
  [252, "https://open.spotify.com/album/1u2Qni8cVRptDTaA00fmBC"],
  [284, "https://open.spotify.com/album/40Wi0Ej08sw9B4URIOabOI"],
  [285, "https://open.spotify.com/album/1rhYQnZdGMZAdo95fTgii8"],
  [307, "https://open.spotify.com/album/4jiO2jRz7g50ESvYYKsKwZ"],
  [311, "https://open.spotify.com/album/3w5Hok05AFjCLy269xXM7e"],
  [327, "https://open.spotify.com/album/6W3aTLI4B5UsPpWMvhT2W4"],
  [335, "https://open.spotify.com/album/6BOlD6UGUg45IsUXPSplkY"],
  [371, "https://open.spotify.com/album/4eDlbgJiIPAtUEMSXx3Ca6"],
  [373, "https://open.spotify.com/album/71rxIr6MJYUzDG9ge6Jq3J"],
  [392, "https://open.spotify.com/album/2UCdfQEDgzWtbzpaD4Mo47"],
  [452, "https://open.spotify.com/album/4bvyr4NxDhpseVZC7bwt9Y"],
  [455, "https://open.spotify.com/album/0tgU9BRoYr0RekpmGPsNaI"],
  [456, "https://open.spotify.com/album/6W0V8B0fJItvOwC8v114rZ"],
  [465, "https://open.spotify.com/album/6Y5SoiYENbNuTBc6mTUKG9"],
  [467, "https://open.spotify.com/album/1cXFSOdjxmS13cOTtnNQAo"],
  [483, "https://open.spotify.com/album/5HM0XnToWhSPYEStptvUYt"],
  [494, "https://open.spotify.com/album/0CoNLgOwcZGBUSwd9fAZuy"],
  [497, "https://open.spotify.com/album/1DIr8JMRBnm1cZMYIGKb8t"],
])

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: null,
    startRank: 1,
    endRank: 500,
    useOdesli: false,
    useAppleMusicApi: false,
    publicSpotify: false,
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
    } else if (arg === "--apple-music-api") {
      options.useAppleMusicApi = true
    } else if (arg === "--public-spotify") {
      options.publicSpotify = true
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
Apple Music catalog links can be filled from Apple's authenticated catalog API.
Direct Spotify album links can be filled from public Wikidata/MusicBrainz metadata.

Optional Apple Music environment:
  APPLE_MUSIC_DEVELOPER_TOKEN
  APPLE_MUSIC_TEAM_ID
  APPLE_MUSIC_KEY_ID
  APPLE_MUSIC_PRIVATE_KEY_PATH

Optional Spotify environment:
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET

Options:
  --dry-run       Do not write data files
  --force         Re-check albums that already have links
  --odesli        Try Songlink/Odesli cross-link lookup from Apple Music URLs
  --apple-music-api
                  Try Apple's catalog API for direct Apple Music album URLs
  --public-spotify
                  Try Wikidata and MusicBrainz public metadata for direct Spotify album URLs
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

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
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

function compactNormalized(value) {
  return normalize(value).replace(/\s+/g, "")
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

function scoreAppleMusicCandidate(album, candidate) {
  const score = scoreCandidate(album, candidate)
  if (score >= APPLE_MUSIC_MIN_SCORE) {
    return score
  }

  const exactArtist = normalize(album.artist) === normalize(candidate.artist)
  const exactYear = candidate.year === Number(album.year)
  const titleOverlap = overlapScore(album.title, candidate.title)
  const compactAlbumTitle = compactNormalized(album.title)
  const compactCandidateTitle = compactNormalized(candidate.title)
  const compactTitleMatch =
    compactAlbumTitle === compactCandidateTitle ||
    compactAlbumTitle.includes(compactCandidateTitle) ||
    compactCandidateTitle.includes(compactAlbumTitle)

  if (exactArtist && exactYear && (titleOverlap >= 0.5 || compactTitleMatch)) {
    return APPLE_MUSIC_MIN_SCORE
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

function cleanAppleMusicAlbumUrl(value) {
  if (!value) {
    return ""
  }

  const url = new URL(value)
  if (url.hostname !== "music.apple.com" || !url.pathname.includes("/album/")) {
    return ""
  }

  for (const key of Array.from(url.searchParams.keys())) {
    if (!["app", "ls", "mt"].includes(key)) {
      url.searchParams.delete(key)
    }
  }
  url.hash = ""
  return url.toString()
}

function cleanSpotifyAlbumUrl(value) {
  if (!isSpotifyAlbumUrl(value)) {
    return ""
  }

  const url = new URL(value)
  url.search = ""
  url.hash = ""
  return url.toString()
}

function isSpotifyAlbumUrl(value) {
  return SPOTIFY_ALBUM_URL_PATTERN.test(String(value ?? ""))
}

function isSpotifySearchUrl(value) {
  return SPOTIFY_SEARCH_URL_PATTERN.test(String(value ?? ""))
}

function getMusicBrainzReleaseGroupId(album) {
  const id = album.external_ids?.musicbrainz_release_group
  return typeof id === "string" && id ? id : ""
}

function spotifyAlbumUrlFromId(id) {
  if (!/^[A-Za-z0-9]+$/.test(String(id ?? ""))) {
    return ""
  }

  return `https://open.spotify.com/album/${id}`
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

function getAppleMusicDeveloperToken() {
  if (process.env.APPLE_MUSIC_DEVELOPER_TOKEN) {
    return process.env.APPLE_MUSIC_DEVELOPER_TOKEN
  }

  const teamId = process.env.APPLE_MUSIC_TEAM_ID
  const keyId = process.env.APPLE_MUSIC_KEY_ID
  const privateKeyPath = process.env.APPLE_MUSIC_PRIVATE_KEY_PATH
  if (!teamId || !keyId || !privateKeyPath) {
    return ""
  }

  const now = Math.floor(Date.now() / 1000)
  const signingInput = [
    base64UrlJson({ alg: "ES256", kid: keyId }),
    base64UrlJson({
      iss: teamId,
      iat: now,
      exp: now + 60 * 60 * 12,
    }),
  ].join(".")
  const privateKey = fsSync.readFileSync(privateKeyPath, "utf8")
  const signature = crypto.sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  })

  return `${signingInput}.${signature.toString("base64url")}`
}

function getAppleSearchTerms(album) {
  const title = String(album.title ?? "")
  const shortenedTitle = title.length > 80 ? title.slice(0, 80).replace(/\s+\S*$/, "") : ""
  const terms = [
    `${album.artist} ${album.title}`,
    `${album.title} ${album.artist}`,
    shortenedTitle ? `${album.artist} ${shortenedTitle}` : "",
  ]

  return Array.from(new Set(terms.map((term) => term.replace(/\s+/g, " ").trim()).filter(Boolean)))
}

async function findAppleMusicCatalogAlbum(album, token) {
  if (!token) {
    return { url: "", score: 0, candidates: [] }
  }

  const candidatesByUrl = new Map()
  for (const term of getAppleSearchTerms(album)) {
    const url = new URL("https://api.music.apple.com/v1/catalog/us/search")
    url.search = new URLSearchParams({
      types: "albums",
      term,
      limit: "25",
    }).toString()
    const json = await fetchJson(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    for (const result of json.results?.albums?.data ?? []) {
      const attributes = result.attributes ?? {}
      const candidateUrl = cleanAppleMusicAlbumUrl(attributes.url)
      if (!candidateUrl) {
        continue
      }

      const candidate = {
        title: attributes.name,
        artist: attributes.artistName,
        year: yearFromDate(attributes.releaseDate),
        url: candidateUrl,
        score: scoreAppleMusicCandidate(album, {
          title: attributes.name,
          artist: attributes.artistName,
          year: yearFromDate(attributes.releaseDate),
        }),
      }
      const existing = candidatesByUrl.get(candidate.url)
      if (!existing || candidate.score > existing.score) {
        candidatesByUrl.set(candidate.url, candidate)
      }
    }

    await sleep(APPLE_DELAY_MS)
  }

  const candidates = Array.from(candidatesByUrl.values()).sort(
    (left, right) => right.score - left.score,
  )
  const best = candidates[0]
  if (!best || best.score < APPLE_MUSIC_MIN_SCORE) {
    return { url: "", score: best?.score ?? 0, candidates }
  }

  return { url: best.url, score: best.score, candidates }
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

async function queryWikidataSpotifyAlbumUrls(albums) {
  const mbids = Array.from(
    new Set(albums.map((album) => getMusicBrainzReleaseGroupId(album)).filter(Boolean)),
  )
  const urlsByMbid = new Map()

  for (let index = 0; index < mbids.length; index += WIKIDATA_CHUNK_SIZE) {
    const chunk = mbids.slice(index, index + WIKIDATA_CHUNK_SIZE)
    const values = chunk.map((mbid) => `"${mbid}"`).join(" ")
    const query = `SELECT ?mbid ?spotify WHERE { VALUES ?mbid { ${values} } ?item wdt:P436 ?mbid; wdt:P2205 ?spotify. }`
    const json = await fetchJson(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`,
      {
        headers: {
          Accept: "application/sparql-results+json",
        },
      },
    )

    for (const binding of json.results?.bindings ?? []) {
      const mbid = binding.mbid?.value
      const url = spotifyAlbumUrlFromId(binding.spotify?.value)
      if (!mbid || !url) {
        continue
      }

      const urls = urlsByMbid.get(mbid) ?? []
      if (!urls.includes(url)) {
        urls.push(url)
      }
      urlsByMbid.set(mbid, urls)
    }
  }

  return urlsByMbid
}

async function findMusicBrainzSpotifyAlbum(album) {
  const mbid = getMusicBrainzReleaseGroupId(album)
  if (!mbid) {
    return { url: "", score: 0, candidates: [] }
  }

  const json = await fetchJson(
    `https://musicbrainz.org/ws/2/release?release-group=${mbid}&inc=url-rels&fmt=json&limit=100`,
  )
  const candidates = []

  for (const release of json.releases ?? []) {
    const artist = (release["artist-credit"] ?? [])
      .map((credit) => credit.name)
      .filter(Boolean)
      .join(" ")
    const releaseScore =
      scoreCandidate(album, {
        title: release.title,
        artist: artist || album.artist,
        year: yearFromDate(release.date),
      }) +
      (release.status === "Official" ? 8 : 0) +
      (release.country === "US" ? 6 : 0)

    for (const relation of release.relations ?? []) {
      const url = cleanSpotifyAlbumUrl(relation.url?.resource)
      if (!url) {
        continue
      }

      candidates.push({
        title: release.title,
        artist: artist || album.artist,
        year: yearFromDate(release.date),
        url,
        score: releaseScore,
      })
    }
  }

  candidates.sort((left, right) => right.score - left.score)
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

async function findOdesliAppleMusicUrl(spotifyUrl) {
  if (!spotifyUrl) {
    return ""
  }

  const json = await fetchJson(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}&userCountry=US`,
  )
  return cleanAppleMusicAlbumUrl(json.linksByPlatform?.appleMusic?.url) ||
    cleanAppleMusicAlbumUrl(json.linksByPlatform?.itunes?.url)
}

function buildSpotifyAlbumSearchUrl(album) {
  const query = encodeURIComponent(`${album.artist} ${album.title} album`)
  return `https://open.spotify.com/search/${query}/albums`
}

async function main() {
  loadProjectEnv()
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const data = JSON.parse(await fs.readFile(DATA_JSON, "utf8"))
  const appleMusicDeveloperToken = options.useAppleMusicApi ? getAppleMusicDeveloperToken() : ""
  if (options.useAppleMusicApi && !appleMusicDeveloperToken) {
    throw new Error(
      "Missing Apple Music token config: set APPLE_MUSIC_DEVELOPER_TOKEN or APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY_PATH.",
    )
  }
  const spotifyToken = await getSpotifyToken()
  const albums = data.albums
    .filter((album) => album.rank >= options.startRank && album.rank <= options.endRank)
    .filter(
      (album) =>
        options.force ||
        !album.apple_music_url ||
        !isSpotifyAlbumUrl(album.spotify_url),
    )
    .slice(0, options.limit ?? undefined)
  const wikidataSpotifyUrls = options.publicSpotify
    ? await queryWikidataSpotifyAlbumUrls(albums)
    : new Map()

  const report = []
  for (const album of albums) {
    const needsApple = options.force || !album.apple_music_url
    const needsSpotify = options.force || !isSpotifyAlbumUrl(album.spotify_url)
    let apple = { url: album.apple_music_url, score: 0, candidates: [] }
    let spotify = { url: album.spotify_url, score: 0, candidates: [] }

    if (needsApple) {
      if (appleMusicDeveloperToken) {
        apple = await findAppleMusicCatalogAlbum(album, appleMusicDeveloperToken)
      }

      if (!apple.url) {
        await sleep(APPLE_DELAY_MS)
        apple = await findAppleAlbum(album)
      }

      if (!apple.url && options.useOdesli && isSpotifyAlbumUrl(album.spotify_url)) {
        const odesliAppleMusicUrl = await findOdesliAppleMusicUrl(album.spotify_url)
        if (odesliAppleMusicUrl) {
          apple = { url: odesliAppleMusicUrl, score: 0, candidates: [] }
        }
      }

      if (apple.url) {
        album.apple_music_url = apple.url
      }
    }

    if (needsSpotify && SPOTIFY_DIRECT_OVERRIDES_BY_RANK.has(album.rank)) {
      const directUrl = SPOTIFY_DIRECT_OVERRIDES_BY_RANK.get(album.rank)
      album.spotify_url = directUrl
      spotify = { url: directUrl, score: 0, candidates: [] }
    }

    if (needsSpotify && !isSpotifyAlbumUrl(album.spotify_url) && options.publicSpotify) {
      const directUrls = wikidataSpotifyUrls.get(getMusicBrainzReleaseGroupId(album)) ?? []
      const directUrl = directUrls.find((url) => isSpotifyAlbumUrl(url))
      if (directUrl) {
        album.spotify_url = directUrl
        spotify = { url: directUrl, score: 0, candidates: [] }
      } else {
        await sleep(MUSICBRAINZ_DELAY_MS)
        spotify = await findMusicBrainzSpotifyAlbum(album)
        if (spotify.url) {
          album.spotify_url = spotify.url
        }
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
      spotify: isSpotifyAlbumUrl(album.spotify_url)
        ? "direct"
        : album.spotify_url
          ? "search"
          : "missing",
      spotifyScore: spotify.score,
    })

    console.log(
      `#${String(album.rank).padStart(3, "0")} ${album.artist} - ${album.title}: Apple ${
        album.apple_music_url ? "ok" : "missing"
      }${
        spotifyToken || options.publicSpotify || options.useOdesli || options.spotifySearchFallback
          ? ` / Spotify ${
              isSpotifyAlbumUrl(album.spotify_url)
                ? "direct"
                : album.spotify_url
                  ? "search"
                  : "missing"
            }`
          : ""
      }`,
    )
  }

  const appleCount = data.albums.filter((album) => album.apple_music_url).length
  const spotifyDirectCount = data.albums.filter((album) => isSpotifyAlbumUrl(album.spotify_url)).length
  const spotifySearchCount = data.albums.filter((album) => isSpotifySearchUrl(album.spotify_url)).length
  const missingApple = report.filter((row) => row.apple === "missing")
  const missingSpotify = report.filter((row) => row.spotify !== "direct")

  console.log(`Apple Music links: ${appleCount}/500`)
  console.log(`Spotify direct album links: ${spotifyDirectCount}/500`)
  console.log(`Spotify search fallback links: ${spotifySearchCount}/500`)
  if (missingApple.length > 0) {
    console.log(`Missing Apple Music ranks: ${missingApple.map((row) => row.rank).join(", ")}`)
  }
  if (
    (spotifyToken || options.publicSpotify || options.useOdesli || options.spotifySearchFallback) &&
    missingSpotify.length > 0
  ) {
    console.log(`Missing direct Spotify ranks: ${missingSpotify.map((row) => row.rank).join(", ")}`)
  }
  if (!spotifyToken && !options.publicSpotify && !options.useOdesli && !options.spotifySearchFallback) {
    console.log(
      "Spotify skipped: pass --public-spotify, set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET, pass --odesli, or pass --spotify-search-fallback.",
    )
  }

  if (options.dryRun) {
    console.log("Dry run: no files written.")
    return
  }

  data.source.generatedAt = new Date().toISOString()
  data.source.streamingLinks =
    "Apple Search API; Apple Music catalog API when --apple-music-api is used; public Wikidata/MusicBrainz metadata when --public-spotify is used; Spotify Web API when SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET are configured; Spotify album search fallback when --spotify-search-fallback is used"
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
