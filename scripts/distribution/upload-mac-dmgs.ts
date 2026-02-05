import { put, list } from "@vercel/blob"
import { createReadStream, existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

type ReleaseFiles = {
  universal: {
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
const listDistFiles = (): string[] =>
  readdirSync(distDir).filter((entry) => !entry.startsWith("."))

const resolveUniversalDmg = (): { name: string; path: string } => {
  const candidates = [
    `Coworkers-${version}-universal.dmg`,
    `coworker-app-${version}-universal.dmg`,
    `Coworkers-${version}.dmg`,
    `coworker-app-${version}.dmg`,
  ]

  for (const candidate of candidates) {
    const candidatePath = path.join(distDir, candidate)
    if (existsSync(candidatePath)) {
      return { name: candidate, path: candidatePath }
    }
  }

  const dmgs = listDistFiles().filter(
    (file) => file.endsWith(".dmg") && file.includes(version),
  )
  if (dmgs.length === 1) {
    return { name: dmgs[0], path: path.join(distDir, dmgs[0]) }
  }

  throw new Error(
    `Missing universal DMG for version ${version}. Found: ${dmgs.join(", ") || "none"}`,
  )
}

const resolveLatestMacYml = (): { name: string; path: string } => {
  const ymlPath = path.join(distDir, "latest-mac.yml")
  if (!existsSync(ymlPath)) {
    throw new Error(`Missing latest-mac.yml in ${distDir}`)
  }
  return { name: "latest-mac.yml", path: ymlPath }
}

const resolveMacZip = (): { name: string; path: string } => {
  const zips = listDistFiles().filter((file) => file.endsWith(".zip"))
  const macZips = zips.filter((file) => file.includes("-mac"))
  const candidates = macZips.length > 0 ? macZips : zips

  const matches = candidates.filter((file) => file.includes(version))
  if (matches.length === 1) {
    return { name: matches[0], path: path.join(distDir, matches[0]) }
  }
  if (candidates.length === 1) {
    return { name: candidates[0], path: path.join(distDir, candidates[0]) }
  }

  throw new Error(
    `Missing mac ZIP for version ${version}. Found: ${candidates.join(", ") || "none"}`,
  )
}

const resolveBlockmap = (zipName: string): { name: string; path: string } => {
  const blockmapName = `${zipName}.blockmap`
  const blockmapPath = path.join(distDir, blockmapName)
  if (existsSync(blockmapPath)) {
    return { name: blockmapName, path: blockmapPath }
  }

  const blockmaps = listDistFiles().filter((file) => file.endsWith(".blockmap"))
  if (blockmaps.length === 1) {
    return { name: blockmaps[0], path: path.join(distDir, blockmaps[0]) }
  }

  throw new Error(
    `Missing blockmap for ${zipName}. Found: ${blockmaps.join(", ") || "none"}`,
  )
}

const dmgUniversal = resolveUniversalDmg()
const latestMacYml = resolveLatestMacYml()
const zipUniversal = resolveMacZip()
const blockmapUniversal = resolveBlockmap(zipUniversal.name)

const downloadKey = `downloads/macos/${version}/${dmgUniversal.name}`
const updatesBase = `updates/macos/stable`

const dmgResult = (await put(
  downloadKey,
  createReadStream(dmgUniversal.path),
  {
    access: "public",
    contentType: "application/x-apple-diskimage",
    addRandomSuffix: false,
    allowOverwrite: true,
  },
)) as PutResult

const [latestResult, zipResult, blockmapResult] = (await Promise.all([
  put(`${updatesBase}/${latestMacYml.name}`, createReadStream(latestMacYml.path), {
    access: "public",
    contentType: "text/yaml",
    addRandomSuffix: false,
    allowOverwrite: true,
  }),
  put(`${updatesBase}/${zipUniversal.name}`, createReadStream(zipUniversal.path), {
    access: "public",
    contentType: "application/zip",
    addRandomSuffix: false,
    allowOverwrite: true,
  }),
  put(
    `${updatesBase}/${blockmapUniversal.name}`,
    createReadStream(blockmapUniversal.path),
    {
      access: "public",
      contentType: "application/octet-stream",
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  ),
])) as [PutResult, PutResult, PutResult]

console.log(`Uploaded ${dmgUniversal.name} -> ${dmgResult.url}`)
console.log(`Uploaded ${latestMacYml.name} -> ${latestResult.url}`)
console.log(`Uploaded ${zipUniversal.name} -> ${zipResult.url}`)
console.log(`Uploaded ${blockmapUniversal.name} -> ${blockmapResult.url}`)

const manifestKey = "downloads/releases.json"

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
    universal: {
      name: dmgUniversal.name,
      url: dmgResult.url,
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
