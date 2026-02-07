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
import { ModelTable } from "./components/ModelTable";
import { ModelFormDialog } from "./components/ModelFormDialog";
import { DeleteModelDialog } from "./components/DeleteModelDialog";
import type { CreateAiModelSchemaInput } from "@coworker/shared-services";

interface Model {
  id: string;
  title: string;
  value: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminModelsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/v1/admin/models", {
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
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      setModels(data.data);
      setFilteredModels(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredModels(models);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredModels(
        models.filter(
          (model) =>
            model.title.toLowerCase().includes(searchLower) ||
            model.value.toLowerCase().includes(searchLower),
        ),
      );
    }
  }, [search, models]);

  const handleCreateModel = () => {
    setEditingModel(null);
    setFormDialogOpen(true);
  };

  const handleEditModel = (model: Model) => {
    setEditingModel(model);
    setFormDialogOpen(true);
  };

  const handleDeleteModel = (model: Model) => {
    setDeletingModel(model);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (model: Model) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/models/${model.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !model.isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update model");
      }

      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
    }
  };

  const handleSetDefault = async (model: Model) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/models/${model.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update model");
      }

      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
    }
  };

  const handleFormSubmit = async (data: CreateAiModelSchemaInput) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const url = editingModel
      ? `/api/v1/admin/models/${editingModel.id}`
      : "/api/v1/admin/models";

    const response = await fetch(url, {
      method: editingModel ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save model");
    }

    setFormDialogOpen(false);
    fetchModels();
  };

  const handleConfirmDelete = async () => {
    if (!deletingModel) return;

    setIsDeleting(true);
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/v1/admin/models/${deletingModel.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete model");
      }

      setDeleteDialogOpen(false);
      setDeletingModel(null);
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-serif text-2xl">AI Models</CardTitle>
                <CardDescription>
                  Manage the models available for coworker responses.
                </CardDescription>
              </div>
              <Button onClick={handleCreateModel}>
                <Plus className="mr-2 h-4 w-4" />
                Add Model
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-accent" />
              </div>
            ) : (
              <ModelTable
                models={filteredModels}
                onEdit={handleEditModel}
                onDelete={handleDeleteModel}
                onSetDefault={handleSetDefault}
                onToggleActive={handleToggleActive}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <ModelFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        model={editingModel}
        onSubmit={handleFormSubmit}
      />

      <DeleteModelDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        model={deletingModel}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
