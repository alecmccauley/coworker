"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { Building2, Users, MessageSquare } from "lucide-react"

const concepts = [
  {
    icon: Building2,
    label: "Your Workspace",
    title: "Shared memory for your entire organization.",
    description:
      "Your goals, preferences, brand guidelines, and strategic priorities—captured once, understood everywhere.",
  },
  {
    icon: Users,
    label: "Your Co-workers",
    title: "Specialized roles, not generic bots.",
    description:
      "Create AI colleagues for specific responsibilities—marketing, finance, research. Each one brings the right expertise.",
  },
  {
    icon: MessageSquare,
    label: "Your Channels",
    title: "Projects that build understanding.",
    description:
      "Organize work around real projects. Context accumulates. Work flows naturally from one session to the next.",
  },
]

export function ConceptsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.1, once: true })

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-12 bg-card/50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="space-y-20 md:space-y-32">
          {concepts.map((concept, index) => {
            const Icon = concept.icon
            const isEven = index % 2 === 1

            return (
              <div
                key={concept.label}
                className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center transition-all duration-700 ${
                  isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className={isEven ? "md:order-2" : ""}>
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-accent/10 text-accent">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-sans uppercase tracking-[0.2em] text-accent font-semibold">
                      {concept.label}
                    </span>
                  </div>
                  <h3 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-foreground leading-[1.15] text-balance">
                    {concept.title}
                  </h3>
                  <p className="mt-4 text-lg font-sans text-muted-foreground leading-relaxed">
                    {concept.description}
                  </p>
                </div>
                <div className={`${isEven ? "md:order-1" : ""} aspect-[4/3] rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border`}>
                  {/* Placeholder for future illustration/screenshot */}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
