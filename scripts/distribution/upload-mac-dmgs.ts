import { put, list } from "@vercel/blob"
import { createReadStream, existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

type ReleaseFiles = {
  arm64: {
    name: string
    url: string
  }
  x64: {
    name: string
    url: string
  }
}

type ReleaseEntry = {
  version: string
  date: string
  files: ReleaseFiles
}

type ReleaseManifest = {
  latest: string
  releases: ReleaseEntry[]
}

type PutResult = {
  url: string
}

type ListBlob = {
  pathname?: string
  path?: string
  key?: string
  url: string
}

type ListResult = {
  blobs: ListBlob[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "../..")

dotenv.config({ path: path.join(rootDir, ".env.distribution") })

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("Missing BLOB_READ_WRITE_TOKEN in .env.distribution")
}

const appPackagePath = path.join(rootDir, "coworker-app/package.json")
const appPackageRaw = readFileSync(appPackagePath, "utf-8")
const appPackage = JSON.parse(appPackageRaw) as { version?: string }
const version = appPackage.version

if (!version) {
  throw new Error("Missing version in coworker-app/package.json")
}

const distDir = path.join(rootDir, "coworker-app/dist")
const resolveDmgPath = (arch: "arm64" | "x64"): { name: string; path: string } => {
  const candidates = [
    `coworker-app-${version}-${arch}.dmg`,
    `Coworkers-${version}-${arch}.dmg`,
  ]

  for (const candidate of candidates) {
    const candidatePath = path.join(distDir, candidate)
    if (existsSync(candidatePath)) {
      return { name: candidate, path: candidatePath }
    }
  }

  return { name: candidates[0], path: path.join(distDir, candidates[0]) }
}

const dmgApple = resolveDmgPath("arm64")
const dmgIntel = resolveDmgPath("x64")
const dmgAppleName = dmgApple.name
const dmgIntelName = dmgIntel.name
const dmgApplePath = dmgApple.path
const dmgIntelPath = dmgIntel.path

const missingFiles: string[] = []
if (!existsSync(dmgApplePath)) missingFiles.push(dmgApplePath)
if (!existsSync(dmgIntelPath)) missingFiles.push(dmgIntelPath)

if (missingFiles.length > 0) {
  throw new Error(`Missing DMG files:\n${missingFiles.join("\n")}`)
}

const blobAppleName = `coworker-app-${version}-arm64.dmg`
const blobIntelName = `coworker-app-${version}-x64.dmg`

const [appleResult, intelResult] = (await Promise.all([
  put(blobAppleName, createReadStream(dmgApplePath), {
    access: "public",
    contentType: "application/x-apple-diskimage",
    addRandomSuffix: false,
    allowOverwrite: true,
  }),
  put(blobIntelName, createReadStream(dmgIntelPath), {
    access: "public",
    contentType: "application/x-apple-diskimage",
    addRandomSuffix: false,
    allowOverwrite: true,
  }),
])) as [PutResult, PutResult]

console.log(`Uploaded ${dmgAppleName} -> ${appleResult.url}`)
console.log(`Uploaded ${dmgIntelName} -> ${intelResult.url}`)

const manifestKey = "releases.json"

const existingManifest = await (async (): Promise<ReleaseManifest | null> => {
  try {
    const result = (await list({
      prefix: manifestKey,
      limit: 1,
    })) as ListResult

    const match = result.blobs.find((blob) => {
      const blobPath = blob.pathname ?? blob.path ?? blob.key
      return blobPath === manifestKey
    })
    if (!match) return null

    const response = await fetch(match.url)
    if (!response.ok) return null

    const data = (await response.json()) as ReleaseManifest
    if (!data.latest || !Array.isArray(data.releases)) return null

    return data
  } catch {
    return null
  }
})()

const nowIso = new Date().toISOString()

const newEntry: ReleaseEntry = {
  version,
  date: nowIso,
  files: {
    arm64: {
      name: blobAppleName,
      url: appleResult.url,
    },
    x64: {
      name: blobIntelName,
      url: intelResult.url,
    },
  },
}

const manifest: ReleaseManifest = existingManifest ?? {
  latest: version,
  releases: [],
}

const existingIndex = manifest.releases.findIndex(
  (entry) => entry.version === version
)
if (existingIndex >= 0) {
  manifest.releases[existingIndex] = newEntry
} else {
  manifest.releases.push(newEntry)
}

manifest.latest = version

const manifestBody = JSON.stringify(manifest, null, 2)

const manifestResult = (await put(manifestKey, manifestBody, {
  access: "public",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
})) as PutResult

console.log(`Updated ${manifestKey} -> ${manifestResult.url}`)
console.log(`DOWNLOAD_MANIFEST_URL=${manifestResult.url}`)
