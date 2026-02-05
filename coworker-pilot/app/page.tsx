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
      arm64?: {
        url: string
      }
      x64?: {
        url: string
      }
    }
  }>
}

type DownloadUrls = {
  apple?: string
  intel?: string
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
      apple: latest.files.arm64?.url,
      intel: latest.files.x64?.url,
    }
  } catch {
    return {}
  }
}

export default async function LandingPage() {
  const { apple, intel } = await getLatestDownloadUrls()

  return (
    <main className="min-h-screen bg-background">
      <LandingNav downloadUrlApple={apple} />
      <HeroSection downloadUrlApple={apple} downloadUrlIntel={intel} />
      <ProblemSection />
      <SolutionSection />
      <ConceptsSection />
      <BenefitsSection />
      <FinalCtaSection downloadUrlApple={apple} downloadUrlIntel={intel} />
    </main>
  )
}
