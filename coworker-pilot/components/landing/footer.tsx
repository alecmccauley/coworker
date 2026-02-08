import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center font-sans text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left md:px-12">
        <p>&copy; {new Date().getFullYear()} MyCo Works Inc.</p>
        <nav className="flex gap-6">
          <Link
            href="/terms"
            className="transition-colors duration-200 hover:text-foreground"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="transition-colors duration-200 hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
