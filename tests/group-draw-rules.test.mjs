import assert from "node:assert/strict"
import test from "node:test"

import {
  GroupDrawRuleError,
  assertGroupCanDraw,
  getActiveGroupDrawMembers,
  formatMemberList,
  getActiveFreshMembers,
  getGroupDrawablePool,
} from "../lib/group-draw-rules.ts"

const members = [
  { id: "amy", displayName: "Amy" },
  { id: "bo", displayName: "Bo" },
  { id: "cy", displayName: "Cy" },
]

test("group drawable pool excludes albums logged by any active member", () => {
  const pool = getGroupDrawablePool(
    [
      { id: "album-a", rank: 1 },
      { id: "album-b", rank: 2 },
      { id: "album-c", rank: 3 },
    ],
    [
      { userId: "amy", albumId: "album-a", kind: "fresh", status: "rated" },
      { userId: "bo", albumId: "album-c", kind: "skip", status: "rated" },
    ],
  )

  assert.deepEqual(pool, [{ id: "album-b", rank: 2 }])
})

test("active fresh members are blocked from a group draw", () => {
  const blocked = getActiveFreshMembers(members, [
    { userId: "amy", albumId: "album-a", kind: "fresh", status: "listening" },
    { userId: "bo", albumId: "album-b", kind: "fresh", status: "rated" },
    { userId: "cy", albumId: "album-c", kind: "skip", status: "rated" },
  ])

  assert.deepEqual(blocked, [{ id: "amy", displayName: "Amy" }])
})

test("group readiness only waits on the active group draw", () => {
  const blocked = getActiveGroupDrawMembers(
    members,
    [
      {
        userId: "amy",
        albumId: "solo-active",
        groupDrawId: null,
        kind: "fresh",
        status: "listening",
      },
      {
        userId: "bo",
        albumId: "group-active",
        groupDrawId: "draw-1",
        kind: "fresh",
        status: "listening",
      },
      {
        userId: "cy",
        albumId: "group-active",
        groupDrawId: "draw-1",
        kind: "fresh",
        status: "rated",
      },
    ],
    "draw-1",
  )

  assert.deepEqual(blocked, [{ id: "bo", displayName: "Bo" }])
})

test("group draw guard blocks empty groups, active picks, and empty pools", () => {
  assert.doesNotThrow(() =>
    assertGroupCanDraw({
      activeMembers: members,
      blockedMembers: [],
      poolSize: 1,
    }),
  )

  assert.throws(
    () =>
      assertGroupCanDraw({
        activeMembers: [],
        blockedMembers: [],
        poolSize: 1,
      }),
    GroupDrawRuleError,
  )
  assert.throws(
    () =>
      assertGroupCanDraw({
        activeMembers: members,
        blockedMembers: [members[0], members[1]],
        poolSize: 1,
      }),
    /Amy and Bo review/,
  )
  assert.throws(
    () =>
      assertGroupCanDraw({
        activeMembers: members,
        blockedMembers: [],
        poolSize: 0,
      }),
    /no shared albums/,
  )
})

test("member list formatting uses natural joining", () => {
  assert.equal(formatMemberList([members[0]]), "Amy")
  assert.equal(formatMemberList([members[0], members[1]]), "Amy and Bo")
  assert.equal(formatMemberList(members), "Amy, Bo, and Cy")
})
