import {
  HeroSection,
  ProblemSection,
  SolutionSection,
  ConceptsSection,
  BenefitsSection,
  FinalCtaSection,
  LandingNav,
} from "@/components/landing"

type ReleaseManifest = {
  latest: string
  releases: Array<{
    version: string
    date: string
    files: {
      universal?: {
        url: string
      }
    }
  }>
}

type DownloadUrls = {
  universal?: string
}

const getLatestDownloadUrls = async (): Promise<DownloadUrls> => {
  const manifestUrl = process.env.DOWNLOAD_MANIFEST_URL
  if (!manifestUrl) return {}

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" })
    if (!response.ok) return {}

    const manifest = (await response.json()) as ReleaseManifest
    if (!manifest.latest || !Array.isArray(manifest.releases)) return {}

    const latest = manifest.releases.find(
      (entry) => entry.version === manifest.latest
    )
    if (!latest?.files) return {}

    return {
      universal: latest.files.universal?.url,
    }
  } catch {
    return {}
  }
}

export default async function LandingPage() {
  const { universal } = await getLatestDownloadUrls()

  return (
    <main className="min-h-screen bg-background">
      <LandingNav downloadUrl={universal} />
      <HeroSection downloadUrl={universal} />
      <ProblemSection />
      <SolutionSection />
      <ConceptsSection />
      <BenefitsSection />
      <FinalCtaSection downloadUrl={universal} />
    </main>
  )
}
