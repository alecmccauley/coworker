"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { tokenStorage } from "@/lib/sdk";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InsiderCodeTable } from "./components/InsiderCodeTable";
import { InsiderCodeFormDialog } from "./components/InsiderCodeFormDialog";
import { DeleteInsiderCodeDialog } from "./components/DeleteInsiderCodeDialog";
import type { CreateInsiderCodeSchemaInput } from "@coworker/shared-services";

interface InsiderCode {
  id: string;
  code: string;
  title: string;
  notes: string | null;
  isActive: boolean;
  activationCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminInsiderCodesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [codes, setCodes] = useState<InsiderCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<InsiderCode[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<InsiderCode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<InsiderCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/v1/admin/insider-codes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        throw new Error("Failed to fetch insider codes");
      }

      const data = await response.json();
      setCodes(data.data);
      setFilteredCodes(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCodes(codes);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredCodes(
        codes.filter(
          (c) =>
            c.code.toLowerCase().includes(searchLower) ||
            c.title.toLowerCase().includes(searchLower) ||
            c.notes?.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [search, codes]);

  const handleCreateCode = () => {
    setEditingCode(null);
    setFormDialogOpen(true);
  };

  const handleEditCode = (code: InsiderCode) => {
    setEditingCode(code);
    setFormDialogOpen(true);
  };

  const handleDeleteCode = (code: InsiderCode) => {
    setDeletingCode(code);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (code: InsiderCode) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/insider-codes/${code.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !code.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update insider code");
      }

      fetchCodes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update insider code"
      );
    }
  };

  const handleFormSubmit = async (data: CreateInsiderCodeSchemaInput) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const url = editingCode
      ? `/api/v1/admin/insider-codes/${editingCode.id}`
      : "/api/v1/admin/insider-codes";

    const response = await fetch(url, {
      method: editingCode ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save insider code");
    }

    setFormDialogOpen(false);
    fetchCodes();
  };

  const handleConfirmDelete = async () => {
    if (!deletingCode) return;

    setIsDeleting(true);
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `/api/v1/admin/insider-codes/${deletingCode.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete insider code");
      }

      setDeleteDialogOpen(false);
      setDeletingCode(null);
      fetchCodes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete insider code"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{currentUser?.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-serif text-2xl">
                  Insider Codes
                </CardTitle>
                <CardDescription>
                  Manage access codes for the insider preview sign-up.
                </CardDescription>
              </div>
              <Button onClick={handleCreateCode}>
                <Plus className="mr-2 h-4 w-4" />
                Add Code
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search codes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Loading */}
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Loading insider codes...
                </p>
              </div>
            ) : (
              <InsiderCodeTable
                codes={filteredCodes}
                onEdit={handleEditCode}
                onDelete={handleDeleteCode}
                onToggleActive={handleToggleActive}
              />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <InsiderCodeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        insiderCode={editingCode}
        onSubmit={handleFormSubmit}
      />
      <DeleteInsiderCodeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        insiderCode={deletingCode}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
