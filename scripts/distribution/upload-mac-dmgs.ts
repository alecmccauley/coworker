import { put, list } from "@vercel/blob"
import { createReadStream, existsSync, readFileSync, readdirSync } from "node:fs"
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

type LatestMacFileEntry = {
  url: string
  sha512: string
  size: number
}

type LatestMacManifest = {
  version: string
  files: LatestMacFileEntry[]
  path: string
  sha512: string
  releaseDate: string
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

const resolveDmgPath = (
  arch: "arm64" | "x64",
): { name: string; path: string } => {
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

  throw new Error(
    `Missing DMG files for ${arch}. Found: ${candidates.join(", ")}`,
  )
}

const resolveLatestMacYml = (
  arch: "arm64" | "x64",
): { name: string; path: string } => {
  const candidates = [
    `latest-mac-${arch}.yml`,
    `latest-mac.yml`,
  ]

  for (const candidate of candidates) {
    const candidatePath = path.join(distDir, candidate)
    if (existsSync(candidatePath)) {
      return { name: candidate, path: candidatePath }
    }
  }

  throw new Error(`Missing latest-mac.yml for ${arch} in ${distDir}`)
}

const resolveMacZip = (
  arch: "arm64" | "x64",
): { name: string; path: string } => {
  const zips = listDistFiles().filter((file) => file.endsWith(".zip"))
  const versionMatches = zips.filter((file) => file.includes(version))
  const archMatches = (files: string[]): string[] =>
    files.filter((file) => file.includes(arch))
  const isGenericMacZip = (file: string): boolean =>
    file.endsWith("-mac.zip") &&
    !file.includes("arm64") &&
    !file.includes("universal") &&
    !file.includes("x64")

  const archCandidates = archMatches(zips)
  const versionedArchCandidates = archMatches(versionMatches)
  const genericMacCandidates =
    arch === "x64" ? zips.filter(isGenericMacZip) : []
  const versionedGenericMacCandidates =
    arch === "x64" ? versionMatches.filter(isGenericMacZip) : []

  const matches =
    versionedArchCandidates.length > 0
      ? versionedArchCandidates
      : versionedGenericMacCandidates

  if (matches.length === 1) {
    return { name: matches[0], path: path.join(distDir, matches[0]) }
  }

  const fallbackCandidates =
    archCandidates.length > 0 ? archCandidates : genericMacCandidates

  if (fallbackCandidates.length === 1) {
    return {
      name: fallbackCandidates[0],
      path: path.join(distDir, fallbackCandidates[0]),
    }
  }

  throw new Error(
    `Missing ${arch} ZIP for version ${version}. Found: ${
      fallbackCandidates.join(", ") || "none"
    }`,
  )
}

const stripQuotes = (value: string): string => {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

const parseLatestMacYml = (
  raw: string,
  source: string,
): LatestMacManifest => {
  const lines = raw.split(/\r?\n/)
  let version = ""
  let pathValue = ""
  let sha512Value = ""
  let releaseDate = ""
  const files: LatestMacFileEntry[] = []

  let index = 0
  const nextLine = (): string | null => {
    if (index >= lines.length) return null
    const line = lines[index]
    index += 1
    return line
  }

  let line = nextLine()
  while (line !== null) {
    if (line.startsWith("version:")) {
      version = stripQuotes(line.split(":").slice(1).join(":"))
    } else if (line.startsWith("files:")) {
      let fileLine = nextLine()
      while (fileLine !== null && fileLine.startsWith("  -")) {
        const urlMatch = fileLine.match(/^\s*-\s+url:\s*(.+)\s*$/)
        if (!urlMatch) {
          throw new Error(`Invalid files entry in ${source}: ${fileLine}`)
        }
        const url = stripQuotes(urlMatch[1])
        const shaLine = nextLine()
        const sizeLine = nextLine()
        if (!shaLine || !sizeLine) {
          throw new Error(`Incomplete files entry in ${source}`)
        }
        const shaMatch = shaLine.match(/^\s*sha512:\s*(.+)\s*$/)
        const sizeMatch = sizeLine.match(/^\s*size:\s*(\d+)\s*$/)
        if (!shaMatch || !sizeMatch) {
          throw new Error(`Invalid files entry in ${source}: ${url}`)
        }
        files.push({
          url,
          sha512: stripQuotes(shaMatch[1]),
          size: Number(sizeMatch[1]),
        })
        fileLine = nextLine()
      }
      line = fileLine
      continue
    } else if (line.startsWith("path:")) {
      pathValue = stripQuotes(line.split(":").slice(1).join(":"))
    } else if (line.startsWith("sha512:")) {
      sha512Value = stripQuotes(line.split(":").slice(1).join(":"))
    } else if (line.startsWith("releaseDate:")) {
      releaseDate = stripQuotes(line.split(":").slice(1).join(":"))
    }
    line = nextLine()
  }

  if (!version || !pathValue || !sha512Value || !releaseDate || files.length === 0) {
    throw new Error(`Invalid latest-mac.yml in ${source}`)
  }

  return {
    version,
    files,
    path: pathValue,
    sha512: sha512Value,
    releaseDate,
  }
}

const serializeLatestMacYml = (manifest: LatestMacManifest): string => {
  const file = manifest.files[0]
  return [
    `version: ${manifest.version}`,
    `files:`,
    `  - url: ${file.url}`,
    `    sha512: ${file.sha512}`,
    `    size: ${file.size}`,
    `path: ${manifest.path}`,
    `sha512: ${manifest.sha512}`,
    `releaseDate: '${manifest.releaseDate}'`,
    "",
  ].join("\n")
}

const buildLatestMacYml = (filePath: string, zipName: string): string => {
  const raw = readFileSync(filePath, "utf-8")
  const manifest = parseLatestMacYml(raw, filePath)
  const zipEntry = manifest.files.find((file) => file.url === zipName)
  if (!zipEntry) {
    const urls = manifest.files.map((file) => file.url).join(", ") || "none"
    throw new Error(`latest-mac.yml missing ${zipName}. Found: ${urls}`)
  }

  return serializeLatestMacYml({
    ...manifest,
    files: [zipEntry],
    path: zipEntry.url,
    sha512: zipEntry.sha512,
  })
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

const dmgArm = resolveDmgPath("arm64")
const dmgX64 = resolveDmgPath("x64")
const latestArm = resolveLatestMacYml("arm64")
const latestX64 = resolveLatestMacYml("x64")
const zipArm = resolveMacZip("arm64")
const zipX64 = resolveMacZip("x64")
const blockmapArm = resolveBlockmap(zipArm.name)
const blockmapX64 = resolveBlockmap(zipX64.name)
const latestArmBody = buildLatestMacYml(latestArm.path, zipArm.name)
const latestX64Body = buildLatestMacYml(latestX64.path, zipX64.name)
const latestBlobName = "latest-mac.yml"

const updatesBase = `updates/macos/stable`

const [armDmgResult, x64DmgResult] = (await Promise.all([
  put(`downloads/macos/${version}/${dmgArm.name}`, createReadStream(dmgArm.path), {
    access: "public",
    contentType: "application/x-apple-diskimage",
    addRandomSuffix: false,
    allowOverwrite: true,
  }),
  put(`downloads/macos/${version}/${dmgX64.name}`, createReadStream(dmgX64.path), {
    access: "public",
    contentType: "application/x-apple-diskimage",
    addRandomSuffix: false,
    allowOverwrite: true,
  }),
])) as [PutResult, PutResult]

const [armLatestResult, x64LatestResult, armZipResult, x64ZipResult, armBlockmapResult, x64BlockmapResult] =
  (await Promise.all([
    put(`${updatesBase}/arm64/${latestBlobName}`, latestArmBody, {
      access: "public",
      contentType: "text/yaml",
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
    put(`${updatesBase}/x64/${latestBlobName}`, latestX64Body, {
      access: "public",
      contentType: "text/yaml",
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
    put(`${updatesBase}/arm64/${zipArm.name}`, createReadStream(zipArm.path), {
      access: "public",
      contentType: "application/zip",
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
    put(`${updatesBase}/x64/${zipX64.name}`, createReadStream(zipX64.path), {
      access: "public",
      contentType: "application/zip",
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
    put(`${updatesBase}/arm64/${blockmapArm.name}`, createReadStream(blockmapArm.path), {
      access: "public",
      contentType: "application/octet-stream",
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
    put(`${updatesBase}/x64/${blockmapX64.name}`, createReadStream(blockmapX64.path), {
      access: "public",
      contentType: "application/octet-stream",
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
  ])) as [PutResult, PutResult, PutResult, PutResult, PutResult, PutResult]

console.log(`Uploaded ${dmgArm.name} -> ${armDmgResult.url}`)
console.log(`Uploaded ${dmgX64.name} -> ${x64DmgResult.url}`)
console.log(`Uploaded ${latestArm.name} -> ${armLatestResult.url}`)
console.log(`Uploaded ${latestX64.name} -> ${x64LatestResult.url}`)
console.log(`Uploaded ${zipArm.name} -> ${armZipResult.url}`)
console.log(`Uploaded ${zipX64.name} -> ${x64ZipResult.url}`)
console.log(`Uploaded ${blockmapArm.name} -> ${armBlockmapResult.url}`)
console.log(`Uploaded ${blockmapX64.name} -> ${x64BlockmapResult.url}`)

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
    arm64: {
      name: dmgArm.name,
      url: armDmgResult.url,
    },
    x64: {
      name: dmgX64.name,
      url: x64DmgResult.url,
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
