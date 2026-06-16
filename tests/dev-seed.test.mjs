import assert from "node:assert/strict"
import test from "node:test"

import {
  assertSafeDevSeedTarget,
  buildDevSeedPlan,
  SAMPLE_USERS,
} from "../scripts/seed-dev.mjs"

function makeAlbums(count = 500) {
  return Array.from({ length: count }, (_, index) => ({
    rank: index + 1,
    title: `Album ${index + 1}`,
    artist: `Artist ${index + 1}`,
    year: 1970 + (index % 50),
    cover_url: `https://example.com/covers/${index + 1}.jpg`,
    spotify_url: "",
    apple_music_url: "",
    external_ids: null,
    review_links: [],
  }))
}

test("dev seed plan covers all 500 albums with unique user-album listens", () => {
  const plan = buildDevSeedPlan({
    albums: makeAlbums(),
    baseDate: new Date("2026-06-16T12:00:00.000Z"),
  })

  const listenedRanks = new Set(plan.listens.map((listen) => listen.albumRank))
  const userAlbumPairs = new Set(
    plan.listens.map((listen) => `${listen.userEmail}:${listen.albumRank}`),
  )

  assert.equal(plan.albums.length, 500)
  assert.equal(listenedRanks.size, 500)
  assert.equal(userAlbumPairs.size, plan.listens.length)
})

test("dev seed plan creates rich sample activity across app surfaces", () => {
  const plan = buildDevSeedPlan({
    albums: makeAlbums(),
    baseDate: new Date("2026-06-16T12:00:00.000Z"),
  })
  const activeByUser = new Map()

  for (const listen of plan.listens) {
    if (listen.status !== "listening") {
      continue
    }

    activeByUser.set(listen.userEmail, (activeByUser.get(listen.userEmail) ?? 0) + 1)
  }

  assert.equal(plan.users.length, SAMPLE_USERS.length)
  assert.equal(plan.groups.length, 3)
  assert.ok(plan.groupDraws.length >= 18)
  assert.ok(plan.feedPosts.length >= 60)
  assert.ok(plan.listens.length > 900)
  assert.ok(Array.from(activeByUser.values()).every((count) => count === 1))
})

test("dev seed refuses remote PocketBase targets by default", () => {
  assert.doesNotThrow(() => assertSafeDevSeedTarget("http://127.0.0.1:8090"))
  assert.doesNotThrow(() => assertSafeDevSeedTarget("http://localhost:8090"))
  assert.throws(
    () => assertSafeDevSeedTarget("http://ai-lab:8091"),
    /Refusing to run seed:dev/,
  )
  assert.doesNotThrow(() =>
    assertSafeDevSeedTarget("http://ai-lab:8091", { allowRemoteDevSeed: true }),
  )
})
