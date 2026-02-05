"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { Download, ArrowRight } from "lucide-react"
import Link from "next/link"

const downloadUrlApple = process.env.NEXT_PUBLIC_DOWNLOAD_URL
const downloadUrlIntel = process.env.NEXT_PUBLIC_DOWNLOAD_URL_INTEL

const downloadButtonBase =
  "group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full font-sans text-sm font-semibold tracking-wide transition-all duration-300 active:scale-[0.98]"

const downloadButtonPrimaryInverted =
  "px-8 py-4 bg-background text-foreground shadow-lg shadow-background/15 hover:scale-[1.03] hover:shadow-xl hover:shadow-background/25 hover:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"

const downloadButtonSecondaryInverted =
  "px-8 py-4 border-2 border-background/90 text-background bg-transparent backdrop-blur-sm shadow-md hover:scale-[1.03] hover:shadow-lg hover:border-accent hover:text-accent hover:bg-accent/10 hover:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"

export function FinalCtaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2, once: true })
  const hasAnyDownload = downloadUrlApple || downloadUrlIntel

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-12 bg-foreground text-background"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className={`font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.1] text-balance transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          Ready to meet your new co-workers?
        </h2>
        <p
          className={`mt-6 text-lg md:text-xl font-sans font-light text-background/70 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-100 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          Download the Insider Preview and experience AI the way it should be.
        </p>

        {hasAnyDownload && (
          <div
            className={`mt-12 flex flex-col items-center gap-4 transition-all duration-700 delay-200 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-4">
              {downloadUrlApple && (
                <a
                  href={downloadUrlApple}
                  className={`${downloadButtonBase} ${downloadButtonPrimaryInverted}`}
                >
                  <Download className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
                  <span className="relative z-10">Download (Apple Silicon)</span>
                </a>
              )}
              {downloadUrlIntel && (
                <a
                  href={downloadUrlIntel}
                  className={`${downloadButtonBase} ${downloadButtonSecondaryInverted}`}
                >
                  <Download className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
                  <span>Download (Intel)</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div
          className={`mt-12 transition-all duration-700 delay-300 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Link
            href="/brand-guide"
            className="group inline-flex items-center gap-2 text-sm font-sans font-medium text-background/70 hover:text-accent transition-colors duration-200"
          >
            <span>Explore the Brand Guide</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
