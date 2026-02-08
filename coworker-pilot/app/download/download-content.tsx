"use client";

import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";

type DownloadContentProps = {
  downloadUrlMac?: string;
};

export function DownloadContent({ downloadUrlMac }: DownloadContentProps) {
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
        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
          <div className="w-full max-w-lg text-center animate-fade-in-up">
            <p className="text-xs font-sans uppercase tracking-[0.3em] text-accent font-semibold mb-6">
              Download
            </p>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.1] text-balance">
              Get Coworkers for macOS.
            </h1>

            <p className="mt-6 text-lg font-sans text-muted-foreground leading-relaxed text-pretty max-w-md mx-auto">
              Download the app, sign in with your email, and you&apos;re in.
            </p>

            {downloadUrlMac && (
              <div className="mt-10 flex flex-col items-center gap-4 animate-fade-in-up [animation-delay:200ms]">
                <a
                  href={downloadUrlMac}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-8 py-4 bg-foreground text-background font-sans text-sm font-semibold shadow-lg shadow-foreground/15 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:gap-4 active:scale-[0.98]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span
                    className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[download-shine_0.6s_ease-out] group-hover:[animation-fill-mode:forwards]"
                    aria-hidden
                  />
                  <Download className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" />
                  <span className="relative z-10">Download for macOS</span>
                </a>
                <p className="text-xs text-muted-foreground/70 font-sans">
                  macOS 13+ required
                </p>
              </div>
            )}

            {!downloadUrlMac && (
              <div className="mt-10 animate-fade-in-up [animation-delay:200ms]">
                <p className="text-sm text-muted-foreground font-sans">
                  The download link will be available soon. Check back shortly.
                </p>
              </div>
            )}

            <div className="mt-16 animate-fade-in-up [animation-delay:400ms]">
              <p className="text-sm text-muted-foreground/70 font-sans">
                Windows &amp; Linux coming March 2026
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
