"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"

const benefits = [
  {
    title: "One subscription, many minds.",
    description: "Access multiple leading AI models through a single subscription.",
  },
  {
    title: "Context that compounds.",
    description: "Every conversation builds on the last.",
  },
  {
    title: "Expertise on demand.",
    description: "The right specialist for every task.",
  },
  {
    title: "Work, not workflow.",
    description: "Spend time on outcomes, not managing tools.",
  },
]

export function BenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2, once: true })

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-12"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-2">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={`p-8 md:p-10 rounded-2xl border border-border bg-card transition-all duration-700 hover:border-accent/30 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <h3 className="font-serif text-2xl md:text-3xl font-medium text-foreground leading-tight">
                {benefit.title}
              </h3>
              <p className="mt-3 font-sans text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
