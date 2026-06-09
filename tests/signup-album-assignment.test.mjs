import assert from "node:assert/strict"
import test from "node:test"

import { getSignupAlbumAssignment } from "../lib/signup-album-assignment.ts"

test("Kevin Russell is assigned Radiohead The Bends on signup", () => {
  assert.deepEqual(getSignupAlbumAssignment(" KevinJohnRussell422@gmail.com "), {
    artist: "Radiohead",
    title: "The Bends",
  })
})

test("everyone else gets no signup album assignment", () => {
  assert.equal(getSignupAlbumAssignment("mavis@example.com"), null)
})
