"use client"

import { useState } from "react"
import { HeroSection } from "@/components/brand-guide/hero-section"
import { PhilosophySection } from "@/components/brand-guide/philosophy-section"
import { ColorSection } from "@/components/brand-guide/color-section"
import { TypographySection } from "@/components/brand-guide/typography-section"
import { SpacingSection } from "@/components/brand-guide/spacing-section"
import { ComponentsSection } from "@/components/brand-guide/components-section"
import { VoiceSection } from "@/components/brand-guide/voice-section"
import { Navigation } from "@/components/brand-guide/navigation"

export default function BrandGuidePage() {
  const [activeSection, setActiveSection] = useState("philosophy")

  return (
    <main className="min-h-screen bg-background">
      <Navigation activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <HeroSection />
      
      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-32">
        <PhilosophySection />
        <ColorSection />
        <TypographySection />
        <SpacingSection />
        <ComponentsSection />
        <VoiceSection />
      </div>
    </main>
  )
}
