import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const ENV_FILE_NAMES = [".env.local", ".env"]

export function loadDotenvFile(filePath, env = process.env) {
  if (!fs.existsSync(filePath)) {
    return false
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed
    const separatorIndex = normalized.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = normalized.slice(0, separatorIndex).trim()
    const rawValue = normalized.slice(separatorIndex + 1).trim()
    if (!key || env[key] !== undefined) {
      continue
    }

    env[key] = rawValue.replace(/^["']|["']$/g, "")
  }

  return true
}

export function getPrimaryCheckoutDir(cwd = process.cwd()) {
  try {
    const commonGitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()

    return commonGitDir ? path.dirname(commonGitDir) : ""
  } catch {
    return ""
  }
}

export function getProjectEnvDirs(cwd = process.cwd(), env = process.env) {
  const dirs = [path.resolve(cwd)]
  const explicitEnvDir = env.SPIN500_ENV_DIR ? path.resolve(cwd, env.SPIN500_ENV_DIR) : ""
  const primaryCheckoutDir = getPrimaryCheckoutDir(cwd)

  for (const dir of [explicitEnvDir, primaryCheckoutDir]) {
    if (dir && !dirs.includes(dir)) {
      dirs.push(dir)
    }
  }

  return dirs
}

export function loadProjectEnv(options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const env = options.env ?? process.env
  const loadedFiles = []

  for (const dir of getProjectEnvDirs(cwd, env)) {
    for (const fileName of ENV_FILE_NAMES) {
      const filePath = path.join(dir, fileName)
      if (loadDotenvFile(filePath, env)) {
        loadedFiles.push(filePath)
      }
    }
  }

  return loadedFiles
}

export function getMissingEnv(keys, env = process.env) {
  return keys.filter((key) => !env[key])
}
