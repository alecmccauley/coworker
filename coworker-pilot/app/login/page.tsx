"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin: _isAdmin, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/admin");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSuccess = () => {
    router.push("/admin");
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If already authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo/Brand */}
      <div className="mb-8 text-center">
        <h1 className="font-serif text-4xl font-medium text-foreground">
          Coworkers
        </h1>
        <p className="mt-2 text-muted-foreground">
          Admin Dashboard
        </p>
      </div>

      {/* Login Form */}
      <LoginForm onSuccess={handleSuccess} />

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Only authorized administrators can access this dashboard.
      </p>
    </div>
  );
}
