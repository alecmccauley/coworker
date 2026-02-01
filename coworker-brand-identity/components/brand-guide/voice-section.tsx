export function VoiceSection() {
  return (
    <section id="voice" className="py-32 scroll-mt-20">
      <div className="grid md:grid-cols-12 gap-12 md:gap-16">
        <div className="md:col-span-4">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-accent">
            06
          </span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Voice &
            <br />
            Tone
          </h2>
          <p className="mt-6 text-base font-sans font-light text-muted-foreground leading-relaxed">
            We speak like humans, not like a company. Direct, warm, and unpretentious. Never jargon. Never cleverness for cleverness&apos; sake.
          </p>
        </div>
        
        <div className="md:col-span-8 space-y-16">
          {/* Core Principles */}
          <div className="space-y-8">
            <div className="border-l-2 border-accent pl-8">
              <p className="text-2xl md:text-3xl font-serif font-normal text-foreground leading-relaxed text-pretty">
                AI should not feel like a tool you have to learn. It should feel like a team you already know how to work with.
              </p>
            </div>
          </div>

          {/* Do / Don't Examples */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Writing Guidelines
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-sans font-medium text-foreground">Do</span>
                </div>
                <div className="space-y-4">
                  <ExampleText text="Create a new co-worker" />
                  <ExampleText text="Your workspace is ready" />
                  <ExampleText text="Something went wrong. Let's try that again." />
                  <ExampleText text="Meet your team" />
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-sm font-sans font-medium text-foreground">Don&apos;t</span>
                </div>
                <div className="space-y-4">
                  <ExampleText text="Initialize new AI agent instance" strikethrough />
                  <ExampleText text="Workspace provisioning complete" strikethrough />
                  <ExampleText text="Error 500: Internal server error" strikethrough />
                  <ExampleText text="AI-powered assistant dashboard" strikethrough />
                </div>
              </div>
            </div>
          </div>

          {/* Voice Attributes */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Voice Attributes
            </h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <VoiceAttribute
                title="Clear"
                description="Every word earns its place. No fluff. No jargon. Say exactly what you mean."
                example="Create co-worker"
              />
              <VoiceAttribute
                title="Warm"
                description="Friendly without being familiar. Professional without being cold. Like a helpful colleague."
                example="Let's get started"
              />
              <VoiceAttribute
                title="Confident"
                description="We know what we're doing. No hedging. No unnecessary qualifiers. Direct and sure."
                example="Your work is saved"
              />
            </div>
          </div>

          {/* Terminology */}
          <div>
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Key Terminology
            </h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4 bg-secondary/30">
                  <span className="text-xs font-sans font-medium text-foreground uppercase tracking-wider">
                    Use
                  </span>
                </div>
                <div className="p-4 bg-secondary/30">
                  <span className="text-xs font-sans font-medium text-foreground uppercase tracking-wider">
                    Avoid
                  </span>
                </div>
              </div>
              {[
                ["Co-worker", "Agent, Bot, Assistant"],
                ["Workspace", "Environment, Instance"],
                ["Channel", "Thread group, Container"],
                ["Create", "Initialize, Instantiate"],
                ["Work", "Task, Operation, Process"],
              ].map(([use, avoid], i) => (
                <div key={i} className="grid grid-cols-2 divide-x divide-border border-t border-border">
                  <div className="p-4">
                    <span className="text-sm font-sans text-foreground">{use}</span>
                  </div>
                  <div className="p-4">
                    <span className="text-sm font-sans text-muted-foreground">{avoid}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Statement */}
          <div className="bg-foreground rounded-xl p-8 md:p-12">
            <p className="text-xl md:text-2xl font-serif font-normal text-background leading-relaxed text-pretty">
              When someone uses Coworkers, they should feel like they&apos;ve been handed something they didn&apos;t realize they were waiting for.
            </p>
            <p className="mt-6 text-sm font-sans text-background/70">
              Not because it&apos;s flashy. Not because it&apos;s the most powerful. But because it&apos;s the first thing that just makes sense.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ExampleText({ text, strikethrough }: { text: string; strikethrough?: boolean }) {
  return (
    <p className={`text-sm font-sans text-muted-foreground ${strikethrough ? "line-through opacity-60" : ""}`}>
      "{text}"
    </p>
  )
}

function VoiceAttribute({ 
  title, 
  description, 
  example 
}: { 
  title: string
  description: string
  example: string 
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h4 className="font-serif text-xl text-foreground">{title}</h4>
      <p className="mt-3 text-sm font-sans text-muted-foreground leading-relaxed">
        {description}
      </p>
      <div className="mt-4 pt-4 border-t border-border/50">
        <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground">Example</span>
        <p className="mt-1 text-sm font-sans font-medium text-foreground">"{example}"</p>
      </div>
    </div>
  )
}
