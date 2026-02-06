"use client"

import { Download, ChevronDown } from "lucide-react"

const downloadButtonBase =
  "group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full font-sans text-sm font-semibold tracking-wide transition-all duration-300 active:scale-[0.98]"

const downloadButtonPrimary =
  "px-8 py-4 bg-foreground text-background shadow-lg shadow-foreground/15 hover:scale-[1.03] hover:shadow-xl hover:shadow-foreground/25 hover:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"

type HeroSectionProps = {
  downloadUrlMac?: string
}

export function HeroSection({
  downloadUrlMac,
}: HeroSectionProps) {
  const hasAnyDownload = downloadUrlMac

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-xs font-sans uppercase tracking-[0.3em] text-accent font-semibold mb-6 animate-fade-in-up">
          Insider Preview
        </p>

        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-foreground leading-[1.05] text-balance animate-fade-in-up [animation-delay:100ms]">
          Work with AI like you work with a team.
        </h1>

        <p className="mt-8 md:mt-10 text-lg md:text-xl lg:text-2xl font-sans font-light text-muted-foreground max-w-3xl mx-auto leading-relaxed text-pretty animate-fade-in-up [animation-delay:200ms]">
          Coworker brings AI into your work the way it should have been from the start—organized, specialized, and always up to speed.
        </p>

        {hasAnyDownload && (
          <div className="mt-12 md:mt-14 flex flex-col items-center gap-4 animate-fade-in-up [animation-delay:300ms]">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {downloadUrlMac && (
                <a
                  href={downloadUrlMac}
                  className={`${downloadButtonBase} ${downloadButtonPrimary}`}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span
                    className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[download-shine_0.6s_ease-out] group-hover:[animation-fill-mode:forwards]"
                    aria-hidden
                  />
                  <Download className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
                  <span className="relative z-10">Download for macOS</span>
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 font-sans">
              macOS 13+ required
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 animate-fade-in-up [animation-delay:500ms]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </div>
      </div>
    </section>
  )
}
