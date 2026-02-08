"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { tokenStorage } from "@/lib/sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackUser {
  id: string;
  email: string;
  name: string | null;
}

interface FeedbackItem {
  id: string;
  userId: string | null;
  user: FeedbackUser | null;
  type: "bug" | "improvement" | "like";
  message: string;
  canContact: boolean;
  includeScreenshot: boolean;
  hasScreenshot: boolean;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoadingScreenshot, setIsLoadingScreenshot] = useState(false);

  const title = useMemo(() => {
    if (!selected) return "";
    if (selected.type === "bug") return "Error / Bug";
    if (selected.type === "improvement") return "Could be improved";
    return "Something I liked";
  }, [selected]);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/v1/admin/feedback", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.status === 403) {
          router.push("/admin");
          return;
        }
        throw new Error("Failed to fetch feedback");
      }

      const data = await response.json();
      setItems(data.data as FeedbackItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    if (!selected || !selected.hasScreenshot) {
      setScreenshotUrl(null);
      return;
    }

    let revoked = false;
    const loadScreenshot = async () => {
      setIsLoadingScreenshot(true);
      try {
        const token = tokenStorage.getAccessToken();
        if (!token) return;
        const response = await fetch(
          `/api/v1/admin/feedback/${selected.id}/screenshot`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          setScreenshotUrl(null);
          return;
        }
        const blob = await response.blob();
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setScreenshotUrl(url);
      } catch {
        setScreenshotUrl(null);
      } finally {
        setIsLoadingScreenshot(false);
      }
    };

    loadScreenshot();

    return () => {
      revoked = true;
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl);
      }
    };
  }, [selected, screenshotUrl]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              <h1 className="font-serif text-xl font-medium text-foreground">
                Feedback
              </h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFeedback}>
            Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No feedback has been submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-accent"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary">
                        {item.type === "bug"
                          ? "Error / Bug"
                          : item.type === "improvement"
                          ? "Could be improved"
                          : "Something I liked"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.user?.email ?? "Anonymous"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.canContact ? "Contact allowed" : "No contact"}
                      </span>
                      {item.hasScreenshot && (
                        <Badge variant="outline">Screenshot</Badge>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground">
                      {item.message}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {selected
                ? new Date(selected.createdAt).toLocaleString()
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{selected.user?.email ?? "Anonymous"}</span>
                <span>
                  {selected.canContact ? "Contact allowed" : "No contact"}
                </span>
                <span>
                  {selected.hasScreenshot ? "Screenshot included" : "No screenshot"}
                </span>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-foreground whitespace-pre-wrap">
                {selected.message}
              </div>
              {selected.hasScreenshot && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  {isLoadingScreenshot ? (
                    <p className="text-sm text-muted-foreground">
                      Loading screenshot...
                    </p>
                  ) : screenshotUrl ? (
                    <img
                      src={screenshotUrl}
                      alt="Feedback screenshot"
                      className="max-h-[420px] w-full rounded-md object-contain"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Screenshot unavailable.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
