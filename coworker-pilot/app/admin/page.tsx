"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogOut, User, Settings, Database, Users, UserCog } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl font-medium text-foreground">
              Coworker Admin
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="font-serif text-3xl font-medium text-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Manage your Coworker application from here.
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Users Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Users</CardTitle>
                  <CardDescription>Manage user accounts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage all registered users in the system.
              </p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Templates Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <UserCog className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <CardDescription>Manage co-worker templates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and manage role-based co-worker templates.
              </p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href="/admin/templates">Manage Templates</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Database Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Database className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Database</CardTitle>
                  <CardDescription>View database status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor database health and run maintenance tasks.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Settings className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <CardDescription>Configure application</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Adjust application settings and preferences.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Auth Status Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Authentication Status</CardTitle>
            <CardDescription>
              Your current session information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-foreground">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {user?.name || "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  User ID
                </dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {user?.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-1 text-sm text-foreground">Administrator</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
