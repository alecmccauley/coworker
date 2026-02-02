"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export function ComponentsSection() {
  return (
    <section id="components" className="py-32 scroll-mt-20">
      <div className="grid md:grid-cols-12 gap-12 md:gap-16">
        <div className="md:col-span-4">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-accent">
            05
          </span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Components
          </h2>
          <p className="mt-6 text-base font-sans font-light text-muted-foreground leading-relaxed">
            Building blocks designed for clarity and delight. Every component should feel inevitable—obvious, not clever.
          </p>
        </div>
        
        <div className="md:col-span-8 space-y-16">
          {/* Buttons */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Buttons
            </h3>
            <div className="bg-card border border-border rounded-xl p-8">
              <div className="flex flex-wrap gap-4 items-center">
                <button className="px-6 py-3 bg-foreground text-background font-sans text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors">
                  Primary Action
                </button>
                <button className="px-6 py-3 bg-transparent border border-foreground text-foreground font-sans text-sm font-medium rounded-lg hover:bg-foreground hover:text-background transition-colors">
                  Secondary
                </button>
                <button className="px-6 py-3 bg-accent text-background font-sans text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors">
                  Accent
                </button>
                <button className="px-6 py-3 text-foreground font-sans text-sm font-medium hover:text-accent transition-colors underline underline-offset-4">
                  Text Link
                </button>
              </div>
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xs font-sans text-muted-foreground">
                  Buttons use 12px vertical padding, 24px horizontal. Text is 14px medium weight. Border radius: 8px.
                </p>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Inputs
            </h3>
            <div className="bg-card border border-border rounded-xl p-8">
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-sans font-medium text-foreground mb-2">
                    Label
                  </label>
                  <input
                    type="text"
                    placeholder="Placeholder text"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  />
                  <p className="mt-2 text-xs font-sans text-muted-foreground">
                    Helper text provides additional context.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-sans font-medium text-foreground mb-2">
                    Textarea
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter longer content here..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Cards
            </h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6 hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h4 className="font-serif text-lg text-foreground">Card Title</h4>
                <p className="mt-2 text-sm font-sans text-muted-foreground leading-relaxed">
                  Cards contain related content and actions. Use subtle borders and rounded corners.
                </p>
              </div>
              <div className="bg-foreground rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="font-serif text-lg text-background">Inverted Card</h4>
                <p className="mt-2 text-sm font-sans text-background/70 leading-relaxed">
                  Use inverted cards sparingly for emphasis or calls-to-action.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Demo */}
          <InteractiveDemo />
        </div>
      </div>
    </section>
  )
}

function InteractiveDemo() {
  const [selected, setSelected] = useState<string | null>(null)
  const [isToggled, setIsToggled] = useState(false)

  return (
    <div>
      <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
        Interactive States
      </h3>
      <div className="bg-card border border-border rounded-xl p-8 space-y-8">
        {/* Selection Group */}
        <div>
          <p className="text-sm font-sans font-medium text-foreground mb-4">Selection</p>
          <div className="flex flex-wrap gap-3">
            {["Option A", "Option B", "Option C"].map((option) => (
              <button
                key={option}
                onClick={() => setSelected(option)}
                className={cn(
                  "px-4 py-2 rounded-lg font-sans text-sm transition-all",
                  selected === option
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle */}
        <div>
          <p className="text-sm font-sans font-medium text-foreground mb-4">Toggle</p>
          <button
            onClick={() => setIsToggled(!isToggled)}
            className={cn(
              "w-12 h-7 rounded-full transition-all relative",
              isToggled ? "bg-accent" : "bg-border"
            )}
            aria-label="Toggle"
          >
            <span
              className={cn(
                "absolute top-1 w-5 h-5 rounded-full bg-background shadow-sm transition-all",
                isToggled ? "left-6" : "left-1"
              )}
            />
          </button>
        </div>

        {/* Notification Badge */}
        <div>
          <p className="text-sm font-sans font-medium text-foreground mb-4">Badges</p>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-accent/10 text-accent rounded-full font-sans text-xs font-medium">
              New
            </span>
            <span className="px-3 py-1 bg-foreground text-background rounded-full font-sans text-xs font-medium">
              Active
            </span>
            <span className="px-3 py-1 bg-secondary text-muted-foreground rounded-full font-sans text-xs font-medium">
              Inactive
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
