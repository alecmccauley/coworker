import {
  HeroSection,
  ProblemSection,
  SolutionSection,
  ConceptsSection,
  BenefitsSection,
  FinalCtaSection,
  LandingNav,
} from "@/components/landing"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <ConceptsSection />
      <BenefitsSection />
      <FinalCtaSection />
    </main>
  )
}
