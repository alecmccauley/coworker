export function SpacingSection() {
  return (
    <section id="spacing" className="py-32 scroll-mt-20">
      <div className="grid md:grid-cols-12 gap-12 md:gap-16">
        <div className="md:col-span-4">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-accent">
            04
          </span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Spacing &
            <br />
            Layout
          </h2>
          <p className="mt-6 text-base font-sans font-light text-muted-foreground leading-relaxed">
            Whitespace is premium. Generous spacing creates breathing room—the calm confidence of a design that doesn&apos;t need to shout.
          </p>
        </div>
        
        <div className="md:col-span-8 space-y-16">
          {/* Spacing Scale */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Spacing Scale
            </h3>
            <div className="space-y-4">
              {[
                { name: "4xs", value: "4px", tailwind: "1" },
                { name: "3xs", value: "8px", tailwind: "2" },
                { name: "2xs", value: "12px", tailwind: "3" },
                { name: "xs", value: "16px", tailwind: "4" },
                { name: "sm", value: "24px", tailwind: "6" },
                { name: "md", value: "32px", tailwind: "8" },
                { name: "lg", value: "48px", tailwind: "12" },
                { name: "xl", value: "64px", tailwind: "16" },
                { name: "2xl", value: "96px", tailwind: "24" },
                { name: "3xl", value: "128px", tailwind: "32" },
              ].map((space) => (
                <div key={space.name} className="flex items-center gap-4">
                  <span className="w-12 text-xs font-sans text-muted-foreground">
                    {space.name}
                  </span>
                  <div 
                    className="bg-accent/30 h-6 rounded-sm transition-all duration-300 hover:bg-accent/50"
                    style={{ width: space.value }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {space.value}
                  </span>
                  <span className="text-xs font-mono text-accent">
                    p-{space.tailwind}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid System */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Grid System
            </h3>
            <div className="bg-card border border-border rounded-xl p-8">
              <div className="grid grid-cols-12 gap-2 mb-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="h-24 bg-accent/20 rounded-md flex items-center justify-center"
                  >
                    <span className="text-xs font-mono text-accent">{i + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm font-sans text-muted-foreground">
                12-column grid with 16px gutter. Maximum content width: 1152px (72rem).
              </p>
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Border Radius
            </h3>
            <div className="flex flex-wrap gap-8">
              {[
                { name: "sm", value: "4px", class: "rounded-sm" },
                { name: "md", value: "6px", class: "rounded-md" },
                { name: "lg", value: "8px", class: "rounded-lg" },
                { name: "xl", value: "12px", class: "rounded-xl" },
                { name: "2xl", value: "16px", class: "rounded-2xl" },
                { name: "full", value: "50%", class: "rounded-full" },
              ].map((radius) => (
                <div key={radius.name} className="text-center">
                  <div 
                    className={`w-20 h-20 bg-foreground ${radius.class}`}
                  />
                  <p className="mt-3 text-xs font-sans text-foreground font-medium">
                    {radius.name}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {radius.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Principles */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h4 className="text-sm font-sans font-medium text-foreground mb-6">
              Layout Principles
            </h4>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-sans font-medium text-foreground">Generous margins</p>
                <p className="text-sm font-sans text-muted-foreground">
                  Minimum 24px padding on mobile, 48px on desktop. Let content breathe.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-sans font-medium text-foreground">Consistent rhythm</p>
                <p className="text-sm font-sans text-muted-foreground">
                  Use the spacing scale consistently. Multiples of 8px create visual harmony.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-sans font-medium text-foreground">Asymmetric balance</p>
                <p className="text-sm font-sans text-muted-foreground">
                  12-column grid enables 4/8 or 5/7 splits—more sophisticated than centered.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-sans font-medium text-foreground">Mobile-first</p>
                <p className="text-sm font-sans text-muted-foreground">
                  Design for small screens first. Enhance, don&apos;t adapt, for larger screens.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
