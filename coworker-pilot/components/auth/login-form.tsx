"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { Loader2, ChevronLeft, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

// Email validation schema
const emailSchema = z.string().email("Please enter a valid email address");

// Code validation schema
const codeSchema = z.string().length(6, "Please enter all 6 digits");

type Step = "email" | "code";

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const { requestCode, verifyCode } = useAuth();

  // Form state
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle email submission
   */
  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate email
      const result = emailSchema.safeParse(email);
      if (!result.success) {
        setError(result.error.errors[0]?.message ?? "Invalid email");
        return;
      }

      setIsLoading(true);

      try {
        await requestCode(email);
        setStep("code");
      } catch (err: unknown) {
        // Handle specific error types
        if (err && typeof err === "object" && "message" in err) {
          const errorMessage = (err as { message: string }).message;
          if (errorMessage.includes("not found") || errorMessage.includes("User not found")) {
            setError("No account found with this email address.");
          } else if (errorMessage.includes("rate limit") || errorMessage.includes("Too many")) {
            setError("Too many attempts. Please try again in a few minutes.");
          } else {
            setError(errorMessage);
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [email, requestCode]
  );

  /**
   * Handle code submission
   */
  const handleCodeSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError(null);

      // Validate code
      const result = codeSchema.safeParse(code);
      if (!result.success) {
        setError(result.error.errors[0]?.message ?? "Invalid code");
        return;
      }

      setIsLoading(true);

      try {
        await verifyCode(email, code);
        onSuccess?.();
      } catch (err: unknown) {
        // Handle specific error types
        if (err && typeof err === "object" && "message" in err) {
          const errorMessage = (err as { message: string }).message;
          if (errorMessage.includes("expired")) {
            setError("This code has expired. Please request a new one.");
          } else if (errorMessage.includes("invalid") || errorMessage.includes("Invalid")) {
            setError("Invalid code. Please check and try again.");
          } else if (errorMessage.includes("attempts")) {
            setError("Too many failed attempts. Please request a new code.");
          } else if (errorMessage.includes("rate limit") || errorMessage.includes("Too many")) {
            setError("Too many attempts. Please try again in a few minutes.");
          } else {
            setError(errorMessage);
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
        setCode("");
      } finally {
        setIsLoading(false);
      }
    },
    [code, email, verifyCode, onSuccess]
  );

  /**
   * Handle code change - auto submit when complete
   */
  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      setError(null);

      // Auto-submit when 6 digits entered
      if (value.length === 6) {
        // Small delay to show the last digit
        setTimeout(() => {
          handleCodeSubmit();
        }, 100);
      }
    },
    [handleCodeSubmit]
  );

  /**
   * Go back to email step
   */
  const handleBack = useCallback(() => {
    setStep("email");
    setCode("");
    setError(null);
  }, []);

  /**
   * Request new code
   */
  const handleResendCode = useCallback(async () => {
    setError(null);
    setCode("");
    setIsLoading(true);

    try {
      await requestCode(email);
      // Show success feedback could be added here
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("Failed to send code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, requestCode]);

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="text-center">
        {step === "code" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="absolute left-4 top-4"
            disabled={isLoading}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          {step === "email" ? (
            <Mail className="h-6 w-6 text-accent" />
          ) : (
            <KeyRound className="h-6 w-6 text-accent" />
          )}
        </div>
        <CardTitle className="font-serif text-2xl font-medium">
          {step === "email" ? "Sign in to Admin" : "Enter verification code"}
        </CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your email to receive a verification code"
            : `We sent a 6-digit code to ${email}`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className={cn(
                  "h-12 px-4 text-base",
                  error && "border-destructive"
                )}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="h-12 w-full text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Label htmlFor="code" className="sr-only">
                Verification code
              </Label>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                disabled={isLoading}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-14 w-12 text-2xl font-medium"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="h-12 w-full text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify code"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
              >
                Didn&apos;t receive a code? Send again
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
