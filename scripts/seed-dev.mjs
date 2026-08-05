#!/usr/bin/env node

import process from "node:process"
import { pathToFileURL } from "node:url"
import PocketBase from "pocketbase"

import {
  findAlbumByRank,
  hasAlbumChanges,
  normalizeAlbum,
  readRows,
} from "./import-albums.mjs"
import { getMissingEnv, loadProjectEnv } from "./env.mjs"

export const SAMPLE_USER_PASSWORD = "spin500-dev"

export const SAMPLE_USERS = [
  { key: "maya", displayName: "Maya Stone", email: "maya.dev@example.com" },
  { key: "ben", displayName: "Ben Navarro", email: "ben.dev@example.com" },
  { key: "lena", displayName: "Lena Brooks", email: "lena.dev@example.com" },
  { key: "omar", displayName: "Omar Vale", email: "omar.dev@example.com" },
  { key: "ivy", displayName: "Ivy Chen", email: "ivy.dev@example.com" },
  { key: "nate", displayName: "Nate Rivers", email: "nate.dev@example.com" },
  { key: "zoe", displayName: "Zoe Calder", email: "zoe.dev@example.com" },
  { key: "eli", displayName: "Eli Mercer", email: "eli.dev@example.com" },
  { key: "rhea", displayName: "Rhea Hart", email: "rhea.dev@example.com" },
  { key: "sam", displayName: "Sam Okafor", email: "sam.dev@example.com" },
  { key: "jules", displayName: "Jules Vega", email: "jules.dev@example.com" },
  { key: "tess", displayName: "Tess Morgan", email: "tess.dev@example.com" },
  {
    key: "archive",
    displayName: "Archive Member",
    email: "archive.dev@example.com",
    deactivated: true,
  },
]

const SAMPLE_GROUPS = [
  {
    key: "crate-diggers",
    name: "Crate Diggers",
    slug: "crate-diggers",
    members: ["maya", "ben", "lena", "omar", "ivy"],
  },
  {
    key: "late-night-side",
    name: "Late Night Side",
    slug: "late-night-side",
    members: ["nate", "zoe", "eli", "rhea"],
  },
  {
    key: "sunday-spin",
    name: "Sunday Spin",
    slug: "sunday-spin",
    members: ["rhea", "sam", "jules", "tess"],
    activeDraw: true,
  },
]

const SAMPLE_FEEDBACK = {
  ideas: [
    {
      key: "export-history",
      title: "Export listening history",
      summary:
        "Download personal listening history, ratings, and reviews as a CSV for backups or personal analysis.",
      status: "planned",
      response:
        "We agree this would make your listening history more useful outside the app. CSV is the leading format.",
      supporters: ["maya", "ben", "lena", "omar", "ivy", "nate", "zoe"],
    },
    {
      key: "album-filters",
      title: "More ways to filter The 500",
      summary:
        "Filter the catalog by decade, listening status, rating range, and albums that still need a review.",
      status: "under_review",
      response:
        "We’re looking at a small set of filters that stay useful without making the catalog feel like a spreadsheet.",
      supporters: ["maya", "lena", "ivy", "rhea"],
    },
    {
      key: "weekly-recap",
      title: "A weekly club recap",
      summary:
        "Show the week’s new reviews, most-discussed albums, and interesting rating movement in one place.",
      status: "in_progress",
      response:
        "A compact recap is in progress. The first version will live inside the app rather than arrive by email.",
      supporters: ["ben", "omar", "nate", "sam", "jules", "tess"],
    },
  ],
  submissions: [
    {
      key: "maya-export",
      userKey: "maya",
      kind: "idea",
      title: "Let me export my reviews",
      body:
        "I’d like a CSV with album, artist, rating, review, and date so I can keep a personal archive and play with the data.",
      status: "planned",
      ideaKey: "export-history",
      pageContext: "Reviews",
      messages: [
        {
          authorKey: "maya",
          fromAdmin: false,
          body: "CSV would be perfect. I don’t need a styled PDF.",
        },
        {
          authorKey: "maya",
          fromAdmin: true,
          body: "That helps. We’re planning around CSV first and will keep the columns straightforward.",
        },
      ],
    },
    {
      key: "ben-recap",
      userKey: "ben",
      kind: "idea",
      title: "What happened this week?",
      body:
        "When I miss a few days, I want one place to catch up on notable reviews and the albums everyone was talking about.",
      status: "in_progress",
      ideaKey: "weekly-recap",
      pageContext: "The Feed",
      messages: [
        {
          authorKey: "maya",
          fromAdmin: true,
          body: "We like this framing. A concise in-app recap is now in progress.",
        },
      ],
    },
    {
      key: "lena-filters",
      userKey: "lena",
      kind: "idea",
      title: "Filter the catalog by decade",
      body:
        "I’m doing a 1970s run and would love to narrow The 500 by decade and whether I’ve already listened.",
      status: "under_review",
      ideaKey: "album-filters",
      pageContext: "The 500",
      messages: [],
    },
    {
      key: "omar-rating-edit",
      userKey: "omar",
      kind: "question",
      title: "Can I revise a rating later?",
      body:
        "Sometimes an album grows on me after a second listen. Is there a way to update my rating without losing the original review?",
      status: "needs_clarification",
      pageContext: "Album detail",
      messages: [
        {
          authorKey: "maya",
          fromAdmin: true,
          body: "Would you want the original rating preserved as history, or is replacing it enough?",
        },
      ],
    },
    {
      key: "ivy-mobile-scroll",
      userKey: "ivy",
      kind: "bug",
      title: "Catalog jumps on mobile",
      body:
        "On my phone, returning from an album sometimes takes me back to the top of the catalog instead of the row I opened.",
      status: "received",
      pageContext: "The 500 · iPhone",
      messages: [],
    },
    {
      key: "nate-private-note",
      userKey: "nate",
      kind: "other",
      title: "Keep my written reviews private",
      body:
        "I like sharing ratings but would sometimes prefer a review to be visible only to me. I’m not sure if that fits the club.",
      status: "not_planned",
      pageContext: "Reviews",
      messages: [
        {
          authorKey: "maya",
          fromAdmin: true,
          body:
            "We’re keeping club reviews shared because conversation is central to the experience. We may explore private draft notes separately.",
        },
      ],
    },
  ],
}

const CURRENT_GROUP_USER_KEYS = new Set(
  SAMPLE_GROUPS.find((group) => group.activeDraw)?.members ?? [],
)

const TAKE_TEMPLATES = [
  "The sequencing finally clicked for me; the quiet middle stretch makes the big chorus feel earned.",
  "I came in for the singles and stayed for the rhythm section. This one rewards a full-album listen.",
  "Messier than I remembered, in a good way. The rough edges make the emotional parts land harder.",
  "A first half classic with one deep cut I had completely underrated.",
  "The production choices are dated in spots, but the songs are sturdy enough to carry it.",
  "This felt like a useful bridge between the canon pick and what came after it.",
  "Not my normal lane, but the vocal performance kept pulling me back in.",
  "A headphones record. The small studio details are doing a lot of the storytelling.",
  "The reputation makes sense, though I liked the side-two run more than the obvious centerpiece.",
  "More charming than perfect. I would absolutely put two tracks on a shared club playlist.",
]

const POST_TEMPLATES = [
  "Needle drop {n}: @{mention} the side-two closer on #{rank} is doing ridiculous work today.",
  "Revisited #{rank} at lunch and the production is way warmer than I remembered.",
  "I thought #{rank} would be background music and then it quietly took over the room.",
  "@{mention} I finally hear what you meant about the drummer on #{rank}.",
  "Catalog sprint note {n}: #{rank} has a better opener than I gave it credit for.",
  "Putting #{rank} in the tiny stack of albums that make errands feel cinematic.",
  "The club average on #{rank} is going to be spicy. I can already feel it.",
  "@{mention} this one belongs in the late-night rotation, no question.",
]

const REPLY_TEMPLATES = [
  "Hard agree. That transition is the whole argument.",
  "I had the opposite reaction, but I respect the swing.",
  "Saving this take for when I get to it.",
  "This is exactly why the list is more fun with receipts.",
  "The bass line is the secret lead vocal.",
]

const LISTEN_REACTION_EMOJIS = ["heart", "fire", "needle", "100", "wow"]
const FEED_REACTION_EMOJIS = ["heart", "fire", "100", "wow"]

function parseArgs(argv) {
  const options = {
    allowRemoteDevSeed: false,
    albumFile: "./data/rs500-albums.json",
    dryRun: false,
    help: false,
    password: SAMPLE_USER_PASSWORD,
    validateOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--album-file" || arg === "--file" || arg === "-f") {
      options.albumFile = argv[index + 1] ?? options.albumFile
      index += 1
    } else if (arg === "--password") {
      options.password = argv[index + 1] ?? options.password
      index += 1
    } else if (arg === "--dry-run") {
      options.dryRun = true
    } else if (arg === "--validate-only") {
      options.validateOnly = true
    } else if (arg === "--allow-remote-dev-seed") {
      options.allowRemoteDevSeed = true
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
  npm run seed:dev
  npm run seed:dev -- --dry-run
  npm run seed:dev -- --validate-only
  npm run seed:dev -- --album-file ./data/rs500-albums.json

Required environment unless --validate-only:
  NEXT_PUBLIC_PB_URL
  PB_ADMIN_EMAIL
  PB_ADMIN_PASSWORD

Safety:
  seed:dev only writes to localhost/127.0.0.1/::1 PocketBase URLs by default.
  Use --allow-remote-dev-seed only for a confirmed disposable remote development backend.

Sample user password:
  ${SAMPLE_USER_PASSWORD}`)
}

export function assertSafeDevSeedTarget(pbUrl, options = {}) {
  if (options.allowRemoteDevSeed) {
    return
  }

  let parsed
  try {
    parsed = new URL(pbUrl)
  } catch {
    throw new Error(`NEXT_PUBLIC_PB_URL must be a valid URL before running seed:dev.`)
  }

  const safeHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
  if (!safeHosts.has(parsed.hostname)) {
    throw new Error(
      `Refusing to run seed:dev against ${pbUrl}. seed:dev writes sample users and reviews, so it only targets localhost by default. Set NEXT_PUBLIC_PB_URL to a local dev PocketBase instance, or pass --allow-remote-dev-seed only for a confirmed disposable remote development backend.`,
    )
  }
}

export function loadAlbums(albumFile) {
  return readRows(albumFile).map((row) => normalizeAlbum(row.raw))
}

export function buildDevSeedPlan({
  albums,
  baseDate = new Date(),
  users = SAMPLE_USERS,
} = {}) {
  if (!Array.isArray(albums) || albums.length === 0) {
    throw new Error("At least one album is required to build the dev seed plan.")
  }

  const sortedAlbums = [...albums].sort((first, second) => first.rank - second.rank)
  const usersByKey = new Map(users.map((user) => [user.key, user]))
  const activeUsers = users.filter((user) => !user.deactivated)
  const reviewUsers = activeUsers
  const listensByKey = new Map()

  for (let albumIndex = 0; albumIndex < sortedAlbums.length; albumIndex += 1) {
    const album = sortedAlbums[albumIndex]
    const user = reviewUsers[albumIndex % reviewUsers.length]
    addListen(listensByKey, buildRatedListen({
      album,
      baseDate,
      kind: albumIndex % 11 === 0 ? "skip" : "fresh",
      seed: albumIndex,
      user,
      weekOffset: -64 + Math.floor(albumIndex / reviewUsers.length),
    }))
  }

  for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
    const user = users[userIndex]
    const targetCount = user.deactivated ? 36 : 88
    let seed = userIndex * 47

    while (countListensForUser(listensByKey, user.email) < targetCount) {
      const album = getAlbumAt(sortedAlbums, seed * 17 + userIndex * 31)
      addListen(listensByKey, buildRatedListen({
        album,
        baseDate,
        kind: seed % 7 === 0 ? "skip" : "fresh",
        seed,
        user,
        weekOffset: -60 + (seed % 52),
      }))
      seed += 1
    }
  }

  for (let userIndex = 0; userIndex < activeUsers.length; userIndex += 1) {
    const user = activeUsers[userIndex]
    if (CURRENT_GROUP_USER_KEYS.has(user.key)) {
      continue
    }

    const album = findUnusedAlbumForUser(
      sortedAlbums,
      listensByKey,
      user.email,
      300 + userIndex * 19,
    )

    addListen(listensByKey, {
      albumRank: album.rank,
      kind: "fresh",
      ratedAt: null,
      rating: null,
      status: "listening",
      take: "",
      userEmail: user.email,
      week: isoWeekKey(baseDate, 0),
    })
  }

  const groupDraws = buildGroupDraws({
    baseDate,
    groups: SAMPLE_GROUPS,
    sortedAlbums,
    usersByKey,
  })

  for (const draw of groupDraws) {
    for (const userKey of draw.memberKeys) {
      const user = usersByKey.get(userKey)
      if (!user) {
        continue
      }

      const album = sortedAlbums.find((item) => item.rank === draw.albumRank)
      addListen(listensByKey, {
        albumRank: draw.albumRank,
        groupDrawKey: draw.key,
        kind: "fresh",
        ratedAt: draw.active ? null : isoDate(baseDate, draw.weekOffset * 7 - 1),
        rating: draw.active ? null : ratingForSeed(draw.albumRank + userKey.length),
        status: draw.active ? "listening" : "rated",
        take: draw.active ? "" : takeForAlbum(album, draw.albumRank + userKey.length),
        userEmail: user.email,
        week: draw.week,
      })
    }
  }

  return {
    albums: sortedAlbums,
    users,
    groups: SAMPLE_GROUPS.map((group) => ({
      key: group.key,
      name: group.name,
      slug: group.slug,
      active: true,
      members: group.members.map((key, index) => ({
        userKey: key,
        role: index === 0 ? "manager" : "member",
      })),
    })),
    groupDraws,
    listens: Array.from(listensByKey.values()).sort(compareListenSeeds),
    feedPosts: buildFeedPosts({ activeUsers, baseDate, sortedAlbums }),
    feedReads: activeUsers.map((user, index) => ({
      lastReadAt: isoDate(baseDate, -1 - index),
      userEmail: user.email,
    })),
    feedback: SAMPLE_FEEDBACK,
  }
}

function buildRatedListen({ album, baseDate, kind, seed, user, weekOffset }) {
  return {
    albumRank: album.rank,
    kind,
    ratedAt: isoDate(baseDate, weekOffset * 7 + (seed % 5)),
    rating: kind === "skip" && seed % 3 === 0 ? null : ratingForSeed(seed + album.rank),
    status: "rated",
    take:
      kind === "skip" && seed % 3 === 0
        ? "Unavailable on my usual streaming setup, so I logged it as a skip for now."
        : takeForAlbum(album, seed),
    userEmail: user.email,
    week: isoWeekKey(baseDate, weekOffset),
  }
}

function buildGroupDraws({ baseDate, groups, sortedAlbums, usersByKey }) {
  const draws = []

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]
    const manager = usersByKey.get(group.members[0])

    for (let drawIndex = 0; drawIndex < 6; drawIndex += 1) {
      const weekOffset = -42 + drawIndex * 5 + groupIndex
      const album = getAlbumAt(sortedAlbums, 40 + groupIndex * 73 + drawIndex * 29)

      draws.push({
        key: `${group.key}:${isoWeekKey(baseDate, weekOffset)}`,
        active: false,
        albumRank: album.rank,
        createdByEmail: manager.email,
        groupKey: group.key,
        memberKeys: group.members,
        week: isoWeekKey(baseDate, weekOffset),
        weekOffset,
      })
    }

    if (group.activeDraw) {
      const album = getAlbumAt(sortedAlbums, 37)
      draws.push({
        key: `${group.key}:${isoWeekKey(baseDate, 0)}`,
        active: true,
        albumRank: album.rank,
        createdByEmail: manager.email,
        groupKey: group.key,
        memberKeys: group.members,
        week: isoWeekKey(baseDate, 0),
        weekOffset: 0,
      })
    }
  }

  return draws
}

function buildFeedPosts({ activeUsers, baseDate, sortedAlbums }) {
  return Array.from({ length: 72 }, (_, index) => {
    const user = activeUsers[index % activeUsers.length]
    const mention = activeUsers[(index + 3) % activeUsers.length]
    const album = getAlbumAt(sortedAlbums, index * 23 + 9)
    const template = POST_TEMPLATES[index % POST_TEMPLATES.length]
    const body = template
      .replace("{n}", String(index + 1).padStart(2, "0"))
      .replace("{rank}", String(album.rank))
      .replace("{mention}", mention.key)

    return {
      key: `post-${String(index + 1).padStart(2, "0")}`,
      albumRank: album.rank,
      body,
      mentionedEmails: body.includes("@") ? [mention.email] : [],
      replies: buildFeedReplies(activeUsers, index),
      reactions: buildFeedReactions(activeUsers, index),
      userEmail: user.email,
      createdHint: isoDate(baseDate, -index),
    }
  })
}

function buildFeedReplies(activeUsers, postIndex) {
  const count = (postIndex % 3) + 1

  return Array.from({ length: count }, (_, index) => {
    const user = activeUsers[(postIndex + index + 2) % activeUsers.length]
    const mention = index === 0 ? activeUsers[(postIndex + 5) % activeUsers.length] : null
    const baseBody = REPLY_TEMPLATES[(postIndex + index) % REPLY_TEMPLATES.length]

    return {
      body: mention ? `${baseBody} @${mention.key}` : baseBody,
      mentionedEmails: mention ? [mention.email] : [],
      userEmail: user.email,
    }
  })
}

function buildFeedReactions(activeUsers, postIndex) {
  const count = (postIndex % 4) + 2

  return Array.from({ length: count }, (_, index) => ({
    emoji: FEED_REACTION_EMOJIS[(postIndex + index) % FEED_REACTION_EMOJIS.length],
    userEmail: activeUsers[(postIndex + index + 1) % activeUsers.length].email,
  }))
}

function addListen(listensByKey, listen) {
  listensByKey.set(`${listen.userEmail}:${listen.albumRank}`, listen)
}

function countListensForUser(listensByKey, email) {
  let count = 0

  for (const listen of listensByKey.values()) {
    if (listen.userEmail === email) {
      count += 1
    }
  }

  return count
}

function findUnusedAlbumForUser(albums, listensByKey, email, seed) {
  for (let offset = 0; offset < albums.length; offset += 1) {
    const album = getAlbumAt(albums, seed + offset)
    if (!listensByKey.has(`${email}:${album.rank}`)) {
      return album
    }
  }

  throw new Error(`No unused album left for ${email}.`)
}

function getAlbumAt(albums, seed) {
  return albums[((seed % albums.length) + albums.length) % albums.length]
}

function compareListenSeeds(first, second) {
  return (
    first.userEmail.localeCompare(second.userEmail) ||
    first.week.localeCompare(second.week) ||
    first.albumRank - second.albumRank
  )
}

function takeForAlbum(album, seed) {
  const template = TAKE_TEMPLATES[seed % TAKE_TEMPLATES.length]
  return `#${album.rank} ${album.title} - ${template}`
}

function ratingForSeed(seed) {
  const tenthRating = 42 + ((seed * 17) % 59)
  return Math.min(10, Number((tenthRating / 10).toFixed(1)))
}

function isoDate(baseDate, dayOffset) {
  const date = new Date(baseDate)
  date.setUTCDate(date.getUTCDate() + dayOffset)
  return date.toISOString()
}

function isoWeekKey(baseDate, weekOffset) {
  const date = new Date(baseDate)
  date.setUTCDate(date.getUTCDate() + weekOffset * 7)

  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7)

  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

async function seedPocketBase(plan, options) {
  loadProjectEnv()

  const pbUrl = process.env.NEXT_PUBLIC_PB_URL
  const adminEmail = process.env.PB_ADMIN_EMAIL
  const adminPassword = process.env.PB_ADMIN_PASSWORD
  const missingEnv = getMissingEnv(["NEXT_PUBLIC_PB_URL", "PB_ADMIN_EMAIL", "PB_ADMIN_PASSWORD"])

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missingEnv.join(", ")}. Checked the shell plus .env.local/.env in this checkout and the primary Git checkout.`,
    )
  }

  assertSafeDevSeedTarget(pbUrl, options)

  const pb = new PocketBase(pbUrl)
  pb.autoCancellation(false)
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword)

  const summary = createSummary()
  const albumRecords = await seedAlbums(pb, plan.albums, options.dryRun, summary)
  const userRecords = await seedUsers(pb, plan.users, options, summary)
  const groupRecords = await seedGroups(pb, plan.groups, userRecords, options.dryRun, summary)
  const groupDrawRecords = await seedGroupDraws(
    pb,
    plan.groupDraws,
    albumRecords,
    groupRecords,
    userRecords,
    options.dryRun,
    summary,
  )
  await closeExtraActiveListens(pb, plan.listens, albumRecords, userRecords, options.dryRun, summary)
  const listenRecords = await seedListens(
    pb,
    plan.listens,
    albumRecords,
    userRecords,
    groupDrawRecords,
    options.dryRun,
    summary,
  )
  await seedListenReactions(pb, listenRecords, plan.users, userRecords, options.dryRun, summary)
  await seedReviewReplies(pb, listenRecords, plan.users, userRecords, options.dryRun, summary)
  const feedPostRecords = await seedFeed(pb, plan.feedPosts, albumRecords, userRecords, options.dryRun, summary)
  await seedFeedReads(pb, plan.feedReads, userRecords, options.dryRun, summary)
  await seedFeedback(pb, plan.feedback, userRecords, options.dryRun, summary)

  return {
    summary,
    counts: {
      albums: albumRecords.size,
      feedPosts: feedPostRecords.size,
      groupDraws: groupDrawRecords.size,
      listens: listenRecords.size,
      users: userRecords.size,
    },
  }
}

async function seedAlbums(pb, albums, dryRun, summary) {
  const records = new Map()

  for (const album of albums) {
    const existing = await findAlbumByRank(pb, album.rank)

    if (!existing) {
      const created = dryRun
        ? { id: `dry-album-${album.rank}`, ...album }
        : await pb.collection("albums").create(album, { requestKey: null })
      records.set(album.rank, created)
      summary.albums.created += 1
      continue
    }

    if (hasAlbumChanges(existing, album)) {
      const updated = dryRun
        ? { ...existing, ...album }
        : await pb.collection("albums").update(existing.id, album, { requestKey: null })
      records.set(album.rank, updated)
      summary.albums.updated += 1
    } else {
      records.set(album.rank, existing)
      summary.albums.skipped += 1
    }
  }

  return records
}

async function seedUsers(pb, users, options, summary) {
  const records = new Map()

  for (const user of users) {
    const existing = await getFirst(pb, "users", pb.filter("email = {:email}", { email: user.email }))
    const payload = {
      email: user.email,
      emailVisibility: true,
      verified: true,
      display_name: user.displayName,
      deactivated_at: user.deactivated ? new Date("2024-01-15T12:00:00.000Z").toISOString() : "",
    }
    const passwordPayload = {
      password: options.password,
      passwordConfirm: options.password,
    }

    if (!existing) {
      const created = options.dryRun
        ? { id: `dry-user-${user.key}`, ...payload }
        : await pb.collection("users").create(
          {
            ...payload,
            ...passwordPayload,
          },
          { requestKey: null },
        )
      records.set(user.email, created)
      summary.users.created += 1
      continue
    }

    const updated = options.dryRun
      ? { ...existing, ...payload }
      : await pb.collection("users").update(
        existing.id,
        {
          ...payload,
          ...passwordPayload,
        },
        { requestKey: null },
      )
    records.set(user.email, updated)
    summary.users.updated += 1
  }

  return records
}

async function seedGroups(pb, groups, userRecords, dryRun, summary) {
  const records = new Map()

  for (const group of groups) {
    const existing = await getFirst(pb, "groups", pb.filter("slug = {:slug}", { slug: group.slug }))
    const payload = {
      name: group.name,
      slug: group.slug,
      active: group.active,
    }
    const record = existing
      ? dryRun
        ? { ...existing, ...payload }
        : await pb.collection("groups").update(existing.id, payload, { requestKey: null })
      : dryRun
        ? { id: `dry-group-${group.key}`, ...payload }
        : await pb.collection("groups").create(payload, { requestKey: null })

    records.set(group.key, record)
    summary.groups[existing ? "updated" : "created"] += 1

    for (const member of group.members) {
      const user = findUserByKey(userRecords, member.userKey)
      const membership = await getFirst(
        pb,
        "group_members",
        pb.filter("group = {:group} && user = {:user}", {
          group: record.id,
          user: user.id,
        }),
      )
      const membershipPayload = {
        group: record.id,
        user: user.id,
        active: true,
        role: member.role,
      }

      if (membership) {
        if (!dryRun) {
          await pb.collection("group_members").update(membership.id, membershipPayload, {
            requestKey: null,
          })
        }
        summary.groupMembers.updated += 1
      } else {
        if (!dryRun) {
          await pb.collection("group_members").create(membershipPayload, { requestKey: null })
        }
        summary.groupMembers.created += 1
      }
    }
  }

  return records
}

async function seedGroupDraws(
  pb,
  groupDraws,
  albumRecords,
  groupRecords,
  userRecords,
  dryRun,
  summary,
) {
  const records = new Map()

  for (const draw of groupDraws) {
    const group = groupRecords.get(draw.groupKey)
    const album = albumRecords.get(draw.albumRank)
    const createdBy = userRecords.get(draw.createdByEmail)
    const existing = await getFirst(
      pb,
      "group_draws",
      pb.filter("group = {:group} && week = {:week}", {
        group: group.id,
        week: draw.week,
      }),
    )
    const payload = {
      group: group.id,
      album: album.id,
      week: draw.week,
      created_by: createdBy.id,
    }
    const record = existing
      ? dryRun
        ? { ...existing, ...payload }
        : await pb.collection("group_draws").update(existing.id, payload, { requestKey: null })
      : dryRun
        ? { id: `dry-group-draw-${draw.key}`, ...payload }
        : await pb.collection("group_draws").create(payload, { requestKey: null })

    records.set(draw.key, record)
    summary.groupDraws[existing ? "updated" : "created"] += 1
  }

  return records
}

async function closeExtraActiveListens(pb, listens, albumRecords, userRecords, dryRun, summary) {
  const targetActiveAlbumsByUser = new Map()

  for (const listen of listens) {
    if (listen.status !== "listening") {
      continue
    }

    const user = userRecords.get(listen.userEmail)
    const album = albumRecords.get(listen.albumRank)
    targetActiveAlbumsByUser.set(user.id, album.id)
  }

  for (const [userId, targetAlbumId] of targetActiveAlbumsByUser.entries()) {
    const activeListens = await pb.collection("listens").getFullList({
      filter: pb.filter('user = {:user} && kind = "fresh" && status = "listening"', {
        user: userId,
      }),
      requestKey: null,
    })

    for (const listen of activeListens) {
      if (asString(listen.album) === targetAlbumId) {
        continue
      }

      if (!dryRun) {
        await pb.collection("listens").update(
          listen.id,
          {
            status: "rated",
            rating: 6.5,
            take: "Auto-closed by the development sample data seeder.",
            rated_at: new Date().toISOString(),
          },
          { requestKey: null },
        )
      }

      summary.listens.closed += 1
    }
  }
}

async function seedListens(
  pb,
  listens,
  albumRecords,
  userRecords,
  groupDrawRecords,
  dryRun,
  summary,
) {
  const records = new Map()

  for (const listen of listens) {
    const album = albumRecords.get(listen.albumRank)
    const user = userRecords.get(listen.userEmail)
    const groupDraw = listen.groupDrawKey ? groupDrawRecords.get(listen.groupDrawKey) : null
    const existing = await getFirst(
      pb,
      "listens",
      pb.filter("user = {:user} && album = {:album}", {
        user: user.id,
        album: album.id,
      }),
    )
    const payload = {
      user: user.id,
      album: album.id,
      kind: listen.kind,
      status: listen.status,
      rating: listen.rating,
      take: listen.take,
      week: listen.week,
      rated_at: listen.ratedAt,
      ...(groupDraw ? { group_draw: groupDraw.id } : {}),
    }
    const record = existing
      ? dryRun
        ? { ...existing, ...payload }
        : await pb.collection("listens").update(existing.id, payload, { requestKey: null })
      : dryRun
        ? { id: `dry-listen-${user.id}-${album.id}`, ...payload }
        : await pb.collection("listens").create(payload, { requestKey: null })

    records.set(`${listen.userEmail}:${listen.albumRank}`, record)
    summary.listens[existing ? "updated" : "created"] += 1
  }

  return records
}

async function seedListenReactions(pb, listenRecords, users, userRecords, dryRun, summary) {
  const activeUsers = users.filter((user) => !user.deactivated)
  let index = 0

  for (const listen of listenRecords.values()) {
    if (index % 4 !== 0) {
      index += 1
      continue
    }

    const actor = activeUsers[(index + 2) % activeUsers.length]
    const user = userRecords.get(actor.email)
    const emoji = LISTEN_REACTION_EMOJIS[index % LISTEN_REACTION_EMOJIS.length]
    const existing = await getFirst(
      pb,
      "reactions",
      pb.filter("listen = {:listen} && user = {:user}", {
        listen: listen.id,
        user: user.id,
      }),
    )
    const payload = {
      listen: listen.id,
      user: user.id,
      emoji,
      comment: index % 3 === 0 ? "This take made me move it up my queue." : "",
    }

    if (existing) {
      if (!dryRun) {
        await pb.collection("reactions").update(existing.id, payload, { requestKey: null })
      }
      summary.listenReactions.updated += 1
    } else {
      if (!dryRun) {
        await pb.collection("reactions").create(payload, { requestKey: null })
      }
      summary.listenReactions.created += 1
    }

    index += 1
  }
}

async function seedReviewReplies(pb, listenRecords, users, userRecords, dryRun, summary) {
  const activeUsers = users.filter((user) => !user.deactivated)
  let index = 0

  for (const listen of listenRecords.values()) {
    if (index % 6 !== 0) {
      index += 1
      continue
    }

    const listenUserId = asString(listen.user)
    let actor = activeUsers[(index + 3) % activeUsers.length]

    if (userRecords.get(actor.email)?.id === listenUserId) {
      actor = activeUsers[(index + 4) % activeUsers.length]
    }
    const user = userRecords.get(actor.email)
    const body = REPLY_TEMPLATES[index % REPLY_TEMPLATES.length]
    const existing = await getFirst(
      pb,
      "review_replies",
      pb.filter("listen = {:listen} && user = {:user} && body = {:body}", {
        listen: listen.id,
        user: user.id,
        body,
      }),
    )
    const payload = {
      listen: listen.id,
      user: user.id,
      body,
    }

    if (existing) {
      summary.reviewReplies.skipped += 1
    } else {
      if (!dryRun) {
        await pb.collection("review_replies").create(payload, { requestKey: null })
      }
      summary.reviewReplies.created += 1
    }

    index += 1
  }
}

async function seedFeed(pb, feedPosts, albumRecords, userRecords, dryRun, summary) {
  const postRecords = new Map()

  for (const post of feedPosts) {
    const user = userRecords.get(post.userEmail)
    const album = albumRecords.get(post.albumRank)
    const existing = await getFirst(
      pb,
      "feed_posts",
      pb.filter("user = {:user} && body = {:body}", {
        user: user.id,
        body: post.body,
      }),
    )
    const payload = {
      user: user.id,
      album: album.id,
      body: post.body,
    }
    const record = existing
      ? dryRun
        ? { ...existing, ...payload }
        : await pb.collection("feed_posts").update(existing.id, payload, { requestKey: null })
      : dryRun
        ? { id: `dry-${post.key}`, ...payload }
        : await pb.collection("feed_posts").create(payload, { requestKey: null })

    postRecords.set(post.key, record)
    summary.feedPosts[existing ? "updated" : "created"] += 1

    for (const mentionedEmail of post.mentionedEmails) {
      await seedFeedMention(pb, {
        actorId: user.id,
        dryRun,
        postId: record.id,
        summary,
        userId: userRecords.get(mentionedEmail).id,
      })
    }

    for (const reply of post.replies) {
      await seedFeedReply(pb, reply, record, userRecords, dryRun, summary)
    }

    for (const reaction of post.reactions) {
      await seedFeedReaction(pb, reaction, record, userRecords, dryRun, summary)
    }
  }

  return postRecords
}

async function seedFeedReply(pb, reply, post, userRecords, dryRun, summary) {
  const user = userRecords.get(reply.userEmail)
  const existing = await getFirst(
    pb,
    "feed_replies",
    pb.filter("post = {:post} && user = {:user} && body = {:body}", {
      post: post.id,
      user: user.id,
      body: reply.body,
    }),
  )
  const payload = {
    post: post.id,
    user: user.id,
    body: reply.body,
  }
  const record = existing
    ? existing
    : dryRun
      ? { id: `dry-reply-${post.id}-${user.id}-${summary.feedReplies.created}`, ...payload }
      : await pb.collection("feed_replies").create(payload, { requestKey: null })

  summary.feedReplies[existing ? "skipped" : "created"] += 1

  for (const mentionedEmail of reply.mentionedEmails) {
    await seedFeedMention(pb, {
      actorId: user.id,
      dryRun,
      postId: post.id,
      replyId: record.id,
      summary,
      userId: userRecords.get(mentionedEmail).id,
    })
  }
}

async function seedFeedReaction(pb, reaction, post, userRecords, dryRun, summary) {
  const user = userRecords.get(reaction.userEmail)
  const existing = await getFirst(
    pb,
    "feed_reactions",
    pb.filter("post = {:post} && user = {:user} && emoji = {:emoji}", {
      post: post.id,
      user: user.id,
      emoji: reaction.emoji,
    }),
  )

  if (existing) {
    summary.feedReactions.skipped += 1
    return
  }

  if (!dryRun) {
    await pb.collection("feed_reactions").create(
      {
        post: post.id,
        user: user.id,
        emoji: reaction.emoji,
      },
      { requestKey: null },
    )
  }

  summary.feedReactions.created += 1
}

async function seedFeedMention(pb, { actorId, dryRun, postId, replyId = "", summary, userId }) {
  try {
    const existingMentions = await pb.collection("feed_mentions").getFullList({
      filter: pb.filter("post = {:post} && actor = {:actor} && user = {:user}", {
        post: postId,
        actor: actorId,
        user: userId,
      }),
      requestKey: null,
    })
    const existing = existingMentions.find((mention) => asString(mention.reply) === replyId)

    if (existing) {
      summary.feedMentions.skipped += 1
      return
    }

    if (!dryRun) {
      await pb.collection("feed_mentions").create(
        {
          post: postId,
          ...(replyId ? { reply: replyId } : {}),
          actor: actorId,
          user: userId,
          read_at: "",
        },
        { requestKey: null },
      )
    }

    summary.feedMentions.created += 1
  } catch {
    summary.feedMentions.skipped += 1
  }
}

async function seedFeedReads(pb, feedReads, userRecords, dryRun, summary) {
  for (const read of feedReads) {
    const user = userRecords.get(read.userEmail)
    const existing = await getFirst(
      pb,
      "feed_reads",
      pb.filter("user = {:user}", {
        user: user.id,
      }),
    )
    const payload = {
      user: user.id,
      last_read_at: read.lastReadAt,
    }

    if (existing) {
      if (!dryRun) {
        await pb.collection("feed_reads").update(existing.id, payload, { requestKey: null })
      }
      summary.feedReads.updated += 1
    } else {
      if (!dryRun) {
        await pb.collection("feed_reads").create(payload, { requestKey: null })
      }
      summary.feedReads.created += 1
    }
  }
}

async function seedFeedback(pb, feedback, userRecords, dryRun, summary) {
  const ideaRecords = new Map()

  for (const idea of feedback.ideas) {
    const existing = await getFirst(
      pb,
      "feedback_ideas",
      pb.filter("title = {:title}", { title: idea.title }),
    )
    const payload = {
      title: idea.title,
      summary: idea.summary,
      status: idea.status,
      response: idea.response,
      support_count: idea.supporters.length,
    }
    const record = existing
      ? dryRun
        ? { ...existing, ...payload }
        : await pb.collection("feedback_ideas").update(existing.id, payload, { requestKey: null })
      : dryRun
        ? { id: `dry-feedback-idea-${idea.key}`, ...payload }
        : await pb.collection("feedback_ideas").create(payload, { requestKey: null })

    ideaRecords.set(idea.key, record)
    summary.feedbackIdeas[existing ? "updated" : "created"] += 1

    for (const supporterKey of idea.supporters) {
      const user = findUserByKey(userRecords, supporterKey)
      const support = await getFirst(
        pb,
        "feedback_idea_support",
        pb.filter("idea = {:idea} && user = {:user}", {
          idea: record.id,
          user: user.id,
        }),
      )

      if (support) {
        summary.feedbackSupports.skipped += 1
      } else {
        if (!dryRun) {
          await pb.collection("feedback_idea_support").create(
            {
              idea: record.id,
              user: user.id,
              reason:
                supporterKey === "maya" && idea.key === "export-history"
                  ? "I keep a personal spreadsheet of everything I listen to."
                  : "",
            },
            { requestKey: null },
          )
        }
        summary.feedbackSupports.created += 1
      }
    }
  }

  for (const submission of feedback.submissions) {
    const user = findUserByKey(userRecords, submission.userKey)
    const idea = submission.ideaKey ? ideaRecords.get(submission.ideaKey) : null
    const existing = await getFirst(
      pb,
      "feedback_submissions",
      pb.filter("user = {:user} && title = {:title}", {
        user: user.id,
        title: submission.title,
      }),
    )
    const payload = {
      user: user.id,
      kind: submission.kind,
      title: submission.title,
      body: submission.body,
      status: submission.status,
      page_context: submission.pageContext,
      user_unread: submission.messages.some((message) => message.fromAdmin),
      ...(idea ? { idea: idea.id } : {}),
    }
    const record = existing
      ? dryRun
        ? { ...existing, ...payload }
        : await pb.collection("feedback_submissions").update(existing.id, payload, {
          requestKey: null,
        })
      : dryRun
        ? { id: `dry-feedback-${submission.key}`, ...payload }
        : await pb.collection("feedback_submissions").create(payload, { requestKey: null })

    summary.feedbackSubmissions[existing ? "updated" : "created"] += 1

    for (const message of submission.messages) {
      const author = findUserByKey(userRecords, message.authorKey)
      const existingMessage = await getFirst(
        pb,
        "feedback_messages",
        pb.filter("submission = {:submission} && author = {:author} && body = {:body}", {
          submission: record.id,
          author: author.id,
          body: message.body,
        }),
      )

      if (existingMessage) {
        summary.feedbackMessages.skipped += 1
      } else {
        if (!dryRun) {
          await pb.collection("feedback_messages").create(
            {
              submission: record.id,
              author: author.id,
              from_admin: message.fromAdmin,
              body: message.body,
            },
            { requestKey: null },
          )
        }
        summary.feedbackMessages.created += 1
      }
    }
  }
}

function createSummary() {
  return {
    albums: emptyChangeSummary(),
    feedMentions: emptyChangeSummary(),
    feedPosts: emptyChangeSummary(),
    feedReactions: emptyChangeSummary(),
    feedReads: emptyChangeSummary(),
    feedReplies: emptyChangeSummary(),
    feedbackIdeas: emptyChangeSummary(),
    feedbackMessages: emptyChangeSummary(),
    feedbackSubmissions: emptyChangeSummary(),
    feedbackSupports: emptyChangeSummary(),
    groupDraws: emptyChangeSummary(),
    groupMembers: emptyChangeSummary(),
    groups: emptyChangeSummary(),
    listenReactions: emptyChangeSummary(),
    listens: { ...emptyChangeSummary(), closed: 0 },
    reviewReplies: emptyChangeSummary(),
    users: emptyChangeSummary(),
  }
}

function emptyChangeSummary() {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
  }
}

function printPlanSummary(plan, label) {
  const uniqueAlbumRanks = new Set(plan.albums.map((album) => album.rank))
  const coveredAlbumRanks = new Set(plan.listens.map((listen) => listen.albumRank))
  const activeListens = plan.listens.filter((listen) => listen.status === "listening")

  console.log("")
  console.log(`Development seed plan${label ? ` (${label})` : ""}:`)
  console.log(`- Albums/artworks: ${uniqueAlbumRanks.size}`)
  console.log(`- Sample users: ${plan.users.length}`)
  console.log(`- Groups: ${plan.groups.length}`)
  console.log(`- Group draws: ${plan.groupDraws.length}`)
  console.log(`- Listens/reviews: ${plan.listens.length}`)
  console.log(`- Albums covered by listens: ${coveredAlbumRanks.size}`)
  console.log(`- Active fresh picks: ${activeListens.length}`)
  console.log(`- Feed posts: ${plan.feedPosts.length}`)
  console.log(`- Feedback submissions: ${plan.feedback.submissions.length}`)
  console.log(`- Public feedback ideas: ${plan.feedback.ideas.length}`)
  console.log(
    `- Feed replies: ${plan.feedPosts.reduce((total, post) => total + post.replies.length, 0)}`,
  )
}

function printSeedSummary(summary, label) {
  console.log("")
  console.log(`Development seed summary${label ? ` (${label})` : ""}:`)

  for (const [name, counts] of Object.entries(summary)) {
    const detail = Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key} ${value}`)
      .join(", ")

    console.log(`- ${name}: ${detail || "no changes"}`)
  }
}

async function getFirst(pb, collection, filter) {
  try {
    return await pb.collection(collection).getFirstListItem(filter, { requestKey: null })
  } catch (error) {
    if (error?.status === 404 || error?.response?.status === 404) {
      return null
    }

    throw error
  }
}

function findUserByKey(userRecords, userKey) {
  const user = SAMPLE_USERS.find((item) => item.key === userKey)
  return userRecords.get(user.email)
}

function asString(value) {
  return typeof value === "string" ? value.trim() : ""
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const albums = loadAlbums(options.albumFile)
  const plan = buildDevSeedPlan({ albums })
  printPlanSummary(plan, options.validateOnly ? "validate only" : options.dryRun ? "dry run" : "")

  if (options.validateOnly) {
    return
  }

  const result = await seedPocketBase(plan, options)
  printSeedSummary(result.summary, options.dryRun ? "dry run" : "")
  console.log("")
  console.log(`Sample login: ${SAMPLE_USERS[0].email} / ${options.password}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
