import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest, AuthContext } from "./auth-middleware";
import { forbiddenResponse } from "./api-utils";

/**
 * Get the list of admin emails from environment variable
 */
export function getAdminEmails(): string[] {
  const adminUsers = process.env.ADMIN_USERS || "";
  return adminUsers
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Check if an email is in the admin list
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Route handler type for admin routes
 */
type AdminHandler = (
  request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrap a route handler to require admin authorization
 * Extends withAuth() to also check if user email is in ADMIN_USERS
 */
export function withAdmin(handler: AdminHandler): (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return withAuth(async (request: AuthenticatedRequest, context) => {
    // Check if user is in admin list
    if (!isAdminEmail(request.auth.email)) {
      return forbiddenResponse("Admin access required");
    }

    return handler(request, context);
  });
}
