import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, JwtExpiredError, JwtValidationError } from "./jwt";
import { prisma } from "@coworker/shared-services/db";

/**
 * Context passed to authenticated route handlers
 */
export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Authenticated request with context
 */
export interface AuthenticatedRequest extends NextRequest {
  auth: AuthContext;
}

/**
 * Route handler type for authenticated routes
 */
type AuthenticatedHandler = (
  request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Route handler type for optionally authenticated routes
 */
type OptionalAuthHandler = (
  request: NextRequest & { auth?: AuthContext },
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Create an unauthorized response
 */
function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json(
    { status: "error", message },
    { status: 401 }
  );
}

/**
 * Wrap a route handler to require authentication
 * Validates JWT, checks user exists, and injects auth context
 */
export function withAuth(handler: AuthenticatedHandler): (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return async (request, context) => {
    const token = extractBearerToken(request);

    if (!token) {
      return unauthorizedResponse("No authentication token provided");
    }

    try {
      // Verify the JWT
      const payload = await verifyAccessToken(token);

      // Verify user still exists in database
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });

      if (!user) {
        return unauthorizedResponse("User not found");
      }

      // Create authenticated request with context
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.auth = {
        userId: user.id,
        email: user.email,
      };

      return handler(authenticatedRequest, context);
    } catch (error) {
      if (error instanceof JwtExpiredError) {
        return unauthorizedResponse("Token has expired");
      }
      if (error instanceof JwtValidationError) {
        return unauthorizedResponse("Invalid token");
      }
      console.error("Auth middleware error:", error);
      return unauthorizedResponse("Authentication failed");
    }
  };
}

/**
 * Wrap a route handler to optionally use authentication
 * If a valid token is provided, injects auth context
 * If no token or invalid token, continues without auth context
 */
export function withOptionalAuth(handler: OptionalAuthHandler): (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return async (request, context) => {
    const token = extractBearerToken(request);
    const optionalAuthRequest = request as NextRequest & { auth?: AuthContext };

    if (token) {
      try {
        const payload = await verifyAccessToken(token);

        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true },
        });

        if (user) {
          optionalAuthRequest.auth = {
            userId: user.id,
            email: user.email,
          };
        }
      } catch {
        // Invalid token - continue without auth
      }
    }

    return handler(optionalAuthRequest, context);
  };
}
