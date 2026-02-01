import { Download } from "lucide-react"

export function HeroSection() {
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL

  return (
    <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 md:px-12 pt-16">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-sans uppercase tracking-[0.3em] text-muted-foreground mb-8">
          Visual Identity System
        </p>
        
        <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-normal tracking-tight text-foreground leading-[0.9] text-balance">
          Coworkers
        </h1>
        
        <p className="mt-12 text-xl md:text-2xl font-sans font-light text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
          Where AI feels like a team you already know how to work with.
        </p>

        {downloadUrl && (
          <div className="mt-14">
            <a
              href={downloadUrl}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-sans text-sm font-medium tracking-wide rounded-full transition-all duration-300 hover:gap-4 hover:shadow-xl hover:shadow-foreground/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
              <span>Download</span>
            </a>
            <p className="mt-4 text-xs text-muted-foreground/70 font-sans">
              Insiders Preview
            </p>
          </div>
        )}
        
        <div className="mt-16 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
        </div>
      </div>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs font-sans uppercase tracking-widest">Scroll</span>
          <svg 
            width="16" 
            height="24" 
            viewBox="0 0 16 24" 
            fill="none" 
            className="animate-bounce"
          >
            <path 
              d="M8 4L8 20M8 20L14 14M8 20L2 14" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
