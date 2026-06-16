import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { getMissingEnv, loadDotenvFile, loadProjectEnv } from "../scripts/env.mjs"

test("dotenv loader keeps existing shell values and reads quoted values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spin500-env-"))
  const envPath = path.join(dir, ".env.local")
  fs.writeFileSync(envPath, "export NEXT_PUBLIC_PB_URL=http://example.test\nPB_ADMIN_EMAIL=\"owner@example.com\"\n")

  const env = { NEXT_PUBLIC_PB_URL: "http://shell.test" }
  assert.equal(loadDotenvFile(envPath, env), true)
  assert.equal(env.NEXT_PUBLIC_PB_URL, "http://shell.test")
  assert.equal(env.PB_ADMIN_EMAIL, "owner@example.com")
})

test("project env loader falls back to the primary checkout for worktrees", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spin500-worktree-env-"))
  const primary = path.join(root, "RS500")
  const worktree = path.join(root, "worktree")
  fs.mkdirSync(primary, { recursive: true })
  execFileSync("git", ["init"], { cwd: primary, stdio: "ignore" })
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: primary })
  execFileSync("git", ["config", "user.name", "Spin 500 Test"], { cwd: primary })
  fs.writeFileSync(path.join(primary, "README.md"), "test\n")
  execFileSync("git", ["add", "README.md"], { cwd: primary })
  execFileSync("git", ["commit", "-m", "init"], { cwd: primary, stdio: "ignore" })
  execFileSync("git", ["worktree", "add", "--detach", worktree, "HEAD"], {
    cwd: primary,
    stdio: "ignore",
  })
  fs.writeFileSync(path.join(primary, ".env.local"), "PB_ADMIN_PASSWORD=from-primary\n")

  const env = {}
  const loadedFiles = loadProjectEnv({ cwd: worktree, env })
  assert.deepEqual(loadedFiles.map((filePath) => fs.realpathSync(filePath)), [
    fs.realpathSync(path.join(primary, ".env.local")),
  ])
  assert.equal(env.PB_ADMIN_PASSWORD, "from-primary")
})

test("missing env helper returns unset keys", () => {
  assert.deepEqual(getMissingEnv(["A", "B"], { A: "set", B: "" }), ["B"])
})
