"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"

export function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2, once: true })

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-12"
    >
      <div className="max-w-6xl mx-auto">
        <div className={`max-w-4xl transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-xs font-sans uppercase tracking-[0.3em] text-accent font-semibold mb-4">
            The Solution
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-foreground leading-[1.1] text-balance">
            What if AI felt like a team you already knew?
          </h2>
          <p
            className={`mt-8 text-lg md:text-xl font-sans font-light text-muted-foreground leading-relaxed max-w-3xl transition-all duration-700 delay-200 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Coworker organizes AI around the way you actually work—with specialized roles, shared context, and projects that build understanding over time.
          </p>
        </div>
      </div>
    </section>
  )
}
