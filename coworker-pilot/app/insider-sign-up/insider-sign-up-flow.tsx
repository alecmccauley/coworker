"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Laptop, FlaskConical, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

const CODE_MIN = 6;
const CODE_MAX = 25;
const codeClientSchema = z
  .string()
  .min(CODE_MIN, `Code must be at least ${CODE_MIN} characters`)
  .max(CODE_MAX, `Code must be ${CODE_MAX} characters or less`)
  .regex(/^[a-z0-9]+$/, "Code must be lowercase letters and numbers only");

type Step = "code" | "agreement" | "account" | "welcome";

type InsiderSignUpFlowProps = {
  downloadUrlMac?: string;
};

export function InsiderSignUpFlow({ downloadUrlMac }: InsiderSignUpFlowProps) {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = codeClientSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/insider/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "This code isn't valid. Double-check and try again.");
        return;
      }

      setStep("agreement");
    } catch {
      setError("Something went wrong. Let's try that again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/insider/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setError(
            "An account with this email already exists. Try signing in from the app instead."
          );
        } else {
          setError(data.message || "Something went wrong. Let's try that again.");
        }
        return;
      }

      setStep("welcome");
    } catch {
      setError("Something went wrong. Let's try that again.");
    } finally {
      setIsLoading(false);
    }
  };

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
        {step === "code" && (
          <StepCode
            code={code}
            onCodeChange={setCode}
            error={error}
            isLoading={isLoading}
            onSubmit={handleValidateCode}
            inputRef={codeInputRef}
          />
        )}
        {step === "agreement" && (
          <StepAgreement
            onContinue={() => setStep("account")}
            onBack={() => setStep("code")}
          />
        )}
        {step === "account" && (
          <StepAccount
            name={name}
            email={email}
            onNameChange={setName}
            onEmailChange={setEmail}
            error={error}
            isLoading={isLoading}
            onSubmit={handleSignUp}
            onBack={() => {
              setError("");
              setStep("agreement");
            }}
          />
        )}
        {step === "welcome" && (
          <StepWelcome name={name} downloadUrlMac={downloadUrlMac} />
        )}
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Step 1: Enter Insider Code
   ────────────────────────────────────────────── */

function StepCode({
  code,
  onCodeChange,
  error,
  isLoading,
  onSubmit,
  inputRef,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  error: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [validationHint, setValidationHint] = useState("");

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip anything that isn't lowercase a-z or 0-9
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const clamped = sanitized.slice(0, CODE_MAX);
    onCodeChange(clamped);

    // Real-time validation hint (only show after user starts typing)
    if (clamped.length === 0) {
      setValidationHint("");
    } else if (clamped.length < CODE_MIN) {
      setValidationHint(`${CODE_MIN - clamped.length} more character${CODE_MIN - clamped.length === 1 ? "" : "s"} needed`);
    } else {
      setValidationHint("");
    }
  };

  const isValid = code.length >= CODE_MIN && code.length <= CODE_MAX;

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="w-full max-w-md text-center animate-fade-in-up">
        <p className="text-xs font-sans uppercase tracking-[0.3em] text-accent font-semibold mb-6">
          Insider Preview
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.1] text-balance">
          Welcome to the insider preview.
        </h1>

        <p className="mt-6 text-lg font-sans text-muted-foreground leading-relaxed text-pretty">
          Enter the access code you received to get started.
        </p>

        <form onSubmit={onSubmit} className="mt-10">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={handleInput}
            placeholder="Enter your access code"
            maxLength={CODE_MAX}
            autoFocus
            autoComplete="off"
            className="w-full rounded-xl border border-input bg-card px-5 py-4 text-center font-mono text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          />

          {validationHint && !error && (
            <p className="mt-3 text-sm text-muted-foreground">
              {validationHint}
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive animate-fade-in-up">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="mt-6 w-full rounded-full bg-foreground px-8 py-4 font-sans text-sm font-semibold text-background shadow-lg shadow-foreground/15 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Step 2: Insider Preview Agreement
   ────────────────────────────────────────────── */

const agreementCards = [
  {
    icon: Laptop,
    title: "Mac only — for now",
    description:
      "The insider preview is available on macOS. Windows and Linux are coming in March 2026.",
  },
  {
    icon: FlaskConical,
    title: "Beta software",
    description:
      "Things may break. When they do, let us know via File > Submit Feedback. Your input shapes the product.",
  },
  {
    icon: Sparkles,
    title: "Unlimited AI access",
    description:
      "We're offering full access on a trust basis. We just ask that you avoid high-intensity automated workloads.",
  },
];

function StepAgreement({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-foreground leading-[1.1] text-balance">
          A few things to know.
        </h2>

        <p className="mt-4 text-lg font-sans text-muted-foreground leading-relaxed">
          The insider preview is our way of building Coworkers together with the people who care most.
        </p>

        <div className="mt-10 space-y-4">
          {agreementCards.map((card, index) => (
            <div
              key={card.title}
              className="rounded-2xl border border-border bg-card p-6 sm:p-8 animate-fade-in-up"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <card.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm font-sans text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          className="mt-10 w-full rounded-full bg-foreground px-8 py-4 font-sans text-sm font-semibold text-background shadow-lg shadow-foreground/15 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl"
        >
          I understand, let&apos;s go
        </button>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Step 3: Create Account
   ────────────────────────────────────────────── */

function StepAccount({
  name,
  email,
  onNameChange,
  onEmailChange,
  error,
  isLoading,
  onSubmit,
  onBack,
}: {
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  error: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="w-full max-w-md animate-fade-in-up">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-foreground leading-[1.1]">
          Create your account.
        </h2>

        <p className="mt-4 text-base font-sans text-muted-foreground leading-relaxed">
          Just a name and email — that&apos;s all we need.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium font-sans text-foreground mb-2"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Your name"
              autoFocus
              autoComplete="name"
              className="w-full rounded-xl border border-input bg-card px-5 py-4 font-sans text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium font-sans text-foreground mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-input bg-card px-5 py-4 font-sans text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive animate-fade-in-up">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim() || !email.trim()}
            className="mt-2 w-full rounded-full bg-foreground px-8 py-4 font-sans text-sm font-semibold text-background shadow-lg shadow-foreground/15 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create my account"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Step 4: Welcome Screen
   ────────────────────────────────────────────── */

function StepWelcome({
  name,
  downloadUrlMac,
}: {
  name: string;
  downloadUrlMac?: string;
}) {
  const firstName = name.split(" ")[0];

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="w-full max-w-lg text-center animate-fade-in-up">
        <p className="text-xs font-sans uppercase tracking-[0.3em] text-accent font-semibold mb-6">
          You&apos;re in
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.1] text-balance">
          Welcome to Coworkers{firstName ? `, ${firstName}` : ""}.
        </h1>

        <p className="mt-6 text-lg font-sans text-muted-foreground leading-relaxed text-pretty max-w-md mx-auto">
          Your account is ready. Download the app and sign in with your email to
          get started.
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
              macOS 13+ required &middot; Windows &amp; Linux coming March 2026
            </p>
          </div>
        )}

        {!downloadUrlMac && (
          <div className="mt-10 animate-fade-in-up [animation-delay:200ms]">
            <p className="text-sm text-muted-foreground font-sans">
              The download link will be available soon. We&apos;ll send you an email
              when it&apos;s ready.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
