"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"

const problems = [
  {
    title: "Technical Friction",
    description:
      "Choosing models, managing subscriptions, learning prompts—working with AI feels like a second job.",
  },
  {
    title: "Lost Context",
    description:
      "Every conversation starts from zero. AI never remembers what you've already explained.",
  },
  {
    title: "Fragmented Tools",
    description:
      "Separate apps, separate accounts, separate bills—your AI workflow is scattered everywhere.",
  },
]

export function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2, once: true })

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-12"
    >
      <div className="max-w-6xl mx-auto">
        <div className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-xs font-sans uppercase tracking-[0.3em] text-accent font-semibold mb-4">
            The Problem
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-foreground leading-[1.1] text-balance max-w-3xl">
            AI is still for experts.
          </h2>
        </div>

        <div className="mt-16 md:mt-20 grid gap-6 md:grid-cols-3">
          {problems.map((problem, index) => (
            <div
              key={problem.title}
              className={`group p-8 rounded-2xl border border-border bg-card transition-all duration-700 hover:border-accent/30 hover:shadow-lg ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <h3 className="font-sans text-xl font-semibold text-foreground mb-3">
                {problem.title}
              </h3>
              <p className="font-sans text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
