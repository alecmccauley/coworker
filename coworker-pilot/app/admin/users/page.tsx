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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { UserTable } from "./components/UserTable";
import { UserFormDialog } from "./components/UserFormDialog";
import { DeleteUserDialog } from "./components/DeleteUserDialog";
import type { CreateUserSchemaInput } from "@coworker/shared-services";

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(
    async (page: number, searchQuery: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const token = tokenStorage.getAccessToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
        });
        if (searchQuery) {
          params.set("search", searchQuery);
        }

        const response = await fetch(`/api/v1/admin/users?${params}`, {
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
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchUsers(pagination.page, search);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page, search);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateUserSchemaInput) => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const url = editingUser
      ? `/api/v1/admin/users/${editingUser.id}`
      : "/api/v1/admin/users";

    const response = await fetch(url, {
      method: editingUser ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save user");
    }

    setFormDialogOpen(false);
    fetchUsers(pagination.page, search);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/v1/admin/users/${deletingUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete user");
      }

      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers(pagination.page, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const { page, totalPages } = pagination;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - 1 && i <= page + 1)
      ) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={i === page}
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(i);
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      } else if (i === page - 2 || i === page + 2) {
        items.push(
          <PaginationItem key={i}>
            <span className="flex h-9 w-9 items-center justify-center">...</span>
          </PaginationItem>
        );
      }
    }

    return items;
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
                <CardTitle className="font-serif text-2xl">Users</CardTitle>
                <CardDescription>
                  Manage all registered users in the system.
                </CardDescription>
              </div>
              <Button onClick={handleCreateUser}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </div>
            </form>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Loading */}
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading users...</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <UserTable
                  users={users}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (pagination.page > 1) {
                                handlePageChange(pagination.page - 1);
                              }
                            }}
                            className={
                              pagination.page <= 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                        {renderPaginationItems()}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (pagination.page < pagination.totalPages) {
                                handlePageChange(pagination.page + 1);
                              }
                            }}
                            className={
                              pagination.page >= pagination.totalPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.pageSize,
                        pagination.total
                      )}{" "}
                      of {pagination.total} users
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        user={editingUser}
        onSubmit={handleFormSubmit}
      />
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={deletingUser}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
