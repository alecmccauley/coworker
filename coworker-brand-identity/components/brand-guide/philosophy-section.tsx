export function PhilosophySection() {
  return (
    <section id="philosophy" className="py-32 scroll-mt-20">
      <div className="grid md:grid-cols-12 gap-12 md:gap-16">
        <div className="md:col-span-4">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-accent">
            01
          </span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Design
            <br />
            Philosophy
          </h2>
        </div>
        
        <div className="md:col-span-8 space-y-12">
          <div className="border-l-2 border-accent pl-8">
            <p className="text-2xl md:text-3xl font-serif font-normal text-foreground leading-relaxed text-pretty">
              Make the extraordinary feel ordinary.
            </p>
          </div>
          
          <p className="text-lg font-sans font-light text-muted-foreground leading-relaxed text-pretty">
            We are not building the best AI model. We are building the best experience for working with AI. Our visual identity must reflect this—technology that disappears into the background, while the human experience feels like magic.
          </p>
          
          <div className="grid sm:grid-cols-3 gap-8 pt-8">
            <PrincipleCard
              number="01"
              title="Clarity"
              description="Every element serves a purpose. Every interaction has a clear reason to exist."
            />
            <PrincipleCard
              number="02"
              title="Partnership"
              description="Work with AI like you work with a team—collaborative, warm, never transactional."
            />
            <PrincipleCard
              number="03"
              title="Delight"
              description="Something people choose, recommend, and talk about. A secret weapon for work."
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function PrincipleCard({ 
  number, 
  title, 
  description 
}: { 
  number: string
  title: string
  description: string 
}) {
  return (
    <div className="group">
      <span className="text-xs font-sans text-accent tracking-wider">{number}</span>
      <h3 className="mt-3 font-serif text-xl font-normal text-foreground">{title}</h3>
      <p className="mt-3 text-sm font-sans font-light text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}
