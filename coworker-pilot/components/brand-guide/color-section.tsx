"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const colors = {
  primary: [
    { 
      name: "Warm Charcoal", 
      variable: "--foreground", 
      hex: "#2D2A26", 
      oklch: "oklch(0.18 0.01 60)",
      usage: "Primary text, headings, key UI elements",
      class: "bg-foreground"
    },
    { 
      name: "Cream", 
      variable: "--background", 
      hex: "#FAF8F5", 
      oklch: "oklch(0.975 0.005 85)",
      usage: "Primary background, canvas, whitespace",
      class: "bg-background"
    },
  ],
  accent: [
    { 
      name: "Terracotta", 
      variable: "--accent", 
      hex: "#C4725C", 
      oklch: "oklch(0.65 0.14 25)",
      usage: "Accent elements, interactive highlights, CTAs",
      class: "bg-accent"
    },
  ],
  neutral: [
    { 
      name: "Warm Sand", 
      variable: "--secondary", 
      hex: "#F0ECE6", 
      oklch: "oklch(0.94 0.008 85)",
      usage: "Secondary backgrounds, cards, subtle separations",
      class: "bg-secondary"
    },
    { 
      name: "Stone", 
      variable: "--muted-foreground", 
      hex: "#6B6560", 
      oklch: "oklch(0.45 0.01 60)",
      usage: "Secondary text, descriptions, placeholders",
      class: "bg-muted-foreground"
    },
    { 
      name: "Pebble", 
      variable: "--border", 
      hex: "#E5E0D8", 
      oklch: "oklch(0.88 0.01 85)",
      usage: "Borders, dividers, subtle lines",
      class: "bg-border"
    },
  ],
}

export function ColorSection() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null)

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text)
    setCopiedColor(name)
    setTimeout(() => setCopiedColor(null), 2000)
  }

  return (
    <section id="colors" className="py-32 scroll-mt-20">
      <div className="grid md:grid-cols-12 gap-12 md:gap-16">
        <div className="md:col-span-4">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-accent">
            02
          </span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Color
            <br />
            Palette
          </h2>
          <p className="mt-6 text-base font-sans font-light text-muted-foreground leading-relaxed">
            Warm, human, approachable. Our palette feels like a sunlit workspace—inviting, not clinical. We use restraint: five colors maximum.
          </p>
        </div>
        
        <div className="md:col-span-8 space-y-16">
          {/* Primary Colors */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Primary
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {colors.primary.map((color) => (
                <ColorCard
                  key={color.name}
                  color={color}
                  copiedColor={copiedColor}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          </div>

          {/* Accent */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Accent
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {colors.accent.map((color) => (
                <ColorCard
                  key={color.name}
                  color={color}
                  copiedColor={copiedColor}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          </div>

          {/* Neutrals */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Neutrals
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {colors.neutral.map((color) => (
                <ColorCard
                  key={color.name}
                  color={color}
                  copiedColor={copiedColor}
                  onCopy={copyToClipboard}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Color Ratio Guide */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h4 className="text-sm font-sans font-medium text-foreground mb-6">
              Usage Ratio
            </h4>
            <div className="flex h-12 rounded-lg overflow-hidden">
              <div className="bg-background flex-[60] border border-border" />
              <div className="bg-foreground flex-[20]" />
              <div className="bg-secondary flex-[15]" />
              <div className="bg-accent flex-[5]" />
            </div>
            <div className="flex mt-4 text-xs font-sans text-muted-foreground">
              <span className="flex-[60]">Cream 60%</span>
              <span className="flex-[20]">Charcoal 20%</span>
              <span className="flex-[15]">Sand 15%</span>
              <span className="flex-[5]">Accent 5%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface ColorCardProps {
  color: {
    name: string
    variable: string
    hex: string
    oklch: string
    usage: string
    class: string
  }
  copiedColor: string | null
  onCopy: (text: string, name: string) => void
  compact?: boolean
}

function ColorCard({ color, copiedColor, onCopy, compact }: ColorCardProps) {
  const isCopied = copiedColor === color.name

  return (
    <div className="group">
      <button
        onClick={() => onCopy(color.hex, color.name)}
        className={cn(
          "w-full rounded-xl transition-all duration-300 relative overflow-hidden",
          compact ? "h-24" : "h-32",
          color.class,
          color.name === "Cream" && "border border-border",
        )}
        aria-label={`Copy ${color.name} color`}
      >
        <span className={cn(
          "absolute inset-0 flex items-center justify-center text-xs font-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity",
          color.name === "Cream" || color.name === "Warm Sand" || color.name === "Pebble" 
            ? "text-foreground" 
            : "text-background"
        )}>
          {isCopied ? "Copied!" : "Copy HEX"}
        </span>
      </button>
      <div className="mt-4 space-y-1">
        <h4 className="text-sm font-sans font-medium text-foreground">{color.name}</h4>
        <p className="text-xs font-mono text-muted-foreground">{color.hex}</p>
        {!compact && (
          <p className="text-xs font-sans text-muted-foreground pt-1">{color.usage}</p>
        )}
      </div>
    </div>
  )
}
