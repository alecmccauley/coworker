"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download } from "lucide-react"
type LandingNavProps = {
  downloadUrlMac?: string
}

export function LandingNav({ downloadUrlMac }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/50 py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/coworkers-logo.png"
            alt="Coworkers"
            width={32}
            height={32}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-serif text-xl font-medium text-foreground hidden sm:block">
            Coworker
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/brand-guide"
            className="text-sm font-sans font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 hidden sm:block"
          >
            Brand Guide
          </Link>

          {downloadUrlMac && (
            <a
              href={downloadUrlMac}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-sans font-semibold transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
            >
              <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}
        </div>
      </div>
    </nav>
  )
}
