export function TypographySection() {
  return (
    <section id="typography" className="py-32 scroll-mt-20">
      <div className="grid md:grid-cols-12 gap-12 md:gap-16">
        <div className="md:col-span-4">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-accent">
            03
          </span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Typography
          </h2>
          <p className="mt-6 text-base font-sans font-light text-muted-foreground leading-relaxed">
            Two typefaces. Maximum clarity. Playfair Display brings warmth and humanity to headlines. Inter ensures perfect readability everywhere else.
          </p>
        </div>
        
        <div className="md:col-span-8 space-y-16">
          {/* Primary Typeface - Display */}
          <div className="border-b border-border pb-16">
            <div className="flex items-baseline justify-between mb-8">
              <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground">
                Display
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                font-serif
              </span>
            </div>
            <div className="space-y-8">
              <div>
                <p className="font-serif text-7xl md:text-8xl font-normal text-foreground tracking-tight">
                  Playfair Display
                </p>
                <p className="mt-4 text-sm font-sans text-muted-foreground">
                  Used for headlines, hero text, and moments of emphasis. Brings warmth and editorial elegance.
                </p>
              </div>
              <div className="font-serif text-4xl text-foreground leading-relaxed">
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
              </div>
              <div className="font-serif text-3xl text-muted-foreground">
                0123456789
              </div>
            </div>
          </div>

          {/* Secondary Typeface - Body */}
          <div className="border-b border-border pb-16">
            <div className="flex items-baseline justify-between mb-8">
              <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground">
                Body
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                font-sans
              </span>
            </div>
            <div className="space-y-8">
              <div>
                <p className="font-sans text-5xl md:text-6xl font-light text-foreground tracking-tight">
                  Inter
                </p>
                <p className="mt-4 text-sm font-sans text-muted-foreground">
                  Used for body copy, UI elements, labels, and all functional text. Optimized for readability at any size.
                </p>
              </div>
              <div className="font-sans text-2xl text-foreground leading-relaxed font-light">
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
              </div>
              <div className="flex gap-8 font-sans text-lg text-muted-foreground">
                <span className="font-light">Light</span>
                <span className="font-normal">Regular</span>
                <span className="font-medium">Medium</span>
                <span className="font-semibold">Semibold</span>
              </div>
            </div>
          </div>

          {/* Type Scale */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Type Scale
            </h3>
            <div className="space-y-6">
              <TypeScaleItem
                label="Display"
                className="font-serif text-6xl md:text-7xl font-normal"
                size="72px / 80px"
              />
              <TypeScaleItem
                label="H1"
                className="font-serif text-5xl font-normal"
                size="48px / 56px"
              />
              <TypeScaleItem
                label="H2"
                className="font-serif text-4xl font-normal"
                size="36px / 44px"
              />
              <TypeScaleItem
                label="H3"
                className="font-serif text-2xl font-normal"
                size="24px / 32px"
              />
              <TypeScaleItem
                label="Body Large"
                className="font-sans text-xl font-light"
                size="20px / 28px"
              />
              <TypeScaleItem
                label="Body"
                className="font-sans text-base font-normal"
                size="16px / 24px"
              />
              <TypeScaleItem
                label="Small"
                className="font-sans text-sm font-normal"
                size="14px / 20px"
              />
              <TypeScaleItem
                label="Caption"
                className="font-sans text-xs font-normal uppercase tracking-widest"
                size="12px / 16px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TypeScaleItem({ 
  label, 
  className, 
  size 
}: { 
  label: string
  className: string
  size: string 
}) {
  return (
    <div className="flex items-baseline gap-8 py-4 border-b border-border/50">
      <span className="w-24 text-xs font-sans text-muted-foreground shrink-0">
        {label}
      </span>
      <span className={`${className} text-foreground flex-1`}>
        Coworkers
      </span>
      <span className="text-xs font-mono text-muted-foreground shrink-0 hidden sm:block">
        {size}
      </span>
    </div>
  )
}
