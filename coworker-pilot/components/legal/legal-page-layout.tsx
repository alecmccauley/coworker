import Image from "next/image"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

type LegalPageLayoutProps = {
  content: string
}

export function LegalPageLayout({ content }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 md:px-12 flex items-center h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/coworkers-logo.png"
              alt="Coworkers"
              width={32}
              height={32}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-serif text-xl font-medium text-foreground">
              Coworkers
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16">
        <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-headings:tracking-tight prose-p:font-sans prose-p:text-foreground/85 prose-p:leading-relaxed prose-a:text-accent prose-a:underline-offset-4 hover:prose-a:text-accent/80 prose-strong:text-foreground prose-li:text-foreground/85 prose-li:font-sans prose-hr:border-border prose-blockquote:border-accent/30 prose-blockquote:text-muted-foreground prose-ul:font-sans prose-ol:font-sans prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  )
}
