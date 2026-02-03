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
import { TemplateTable } from "./components/TemplateTable";
import { TemplateFormDialog } from "./components/TemplateFormDialog";
import { DeleteTemplateDialog } from "./components/DeleteTemplateDialog";
import type { CreateCoworkerTemplateSchemaInput } from "@coworker/shared-services";

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rolePrompt: string;
  defaultBehaviorsJson: string | null;
  defaultToolsPolicyJson: string | null;
  modelRoutingPolicyJson: string | null;
  version: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminTemplatesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/v1/admin/templates", {
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
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.data);
      setFilteredTemplates(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredTemplates(templates);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredTemplates(
        templates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.slug.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [search, templates]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormDialogOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormDialogOpen(true);
  };

  const handleDeleteTemplate = (template: Template) => {
    setDeletingTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleTogglePublish = async (template: Template) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished: !template.isPublished }),
      });

      if (!response.ok) {
        throw new Error("Failed to update template");
      }

      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update template");
    }
  };

  const handleFormSubmit = async (data: CreateCoworkerTemplateSchemaInput) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const url = editingTemplate
      ? `/api/v1/admin/templates/${editingTemplate.id}`
      : "/api/v1/admin/templates";

    const response = await fetch(url, {
      method: editingTemplate ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save template");
    }

    setFormDialogOpen(false);
    fetchTemplates();
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;

    setIsDeleting(true);
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/v1/admin/templates/${deletingTemplate.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete template");
      }

      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
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
                <CardTitle className="font-serif text-2xl">Co-worker Templates</CardTitle>
                <CardDescription>
                  Manage role-based templates that users can use to create co-workers.
                </CardDescription>
              </div>
              <Button onClick={handleCreateTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
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
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              </div>
            ) : (
              <TemplateTable
                templates={filteredTemplates}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onTogglePublish={handleTogglePublish}
              />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <TemplateFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        template={editingTemplate}
        onSubmit={handleFormSubmit}
      />
      <DeleteTemplateDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        template={deletingTemplate}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
