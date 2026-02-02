import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, unauthorizedResponse } from "./api-utils";

const MACHINE_KEY_HEADER = "x-machine-key";

/**
 * Get the configured machine key from environment
 */
export function getMachineKey(): string | null {
  const key = process.env.MACHINE_KEY;
  if (!key) {
    return null;
  }
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extract machine key from request headers
 */
export function extractMachineKey(request: NextRequest): string | null {
  const headerValue = request.headers.get(MACHINE_KEY_HEADER);
  if (!headerValue) {
    return null;
  }
  const trimmed = headerValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Constant-time comparison for machine keys
 */
export function isMachineKeyValid(
  providedKey: string,
  expectedKey: string
): boolean {
  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(expectedKey);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Route handler type for machine-key protected routes
 */
type MachineKeyHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrap a route handler to require a valid machine key
 */
export function withMachineKey(handler: MachineKeyHandler): (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return async (request, context) => {
    const expectedKey = getMachineKey();
    if (!expectedKey) {
      return errorResponse("Machine key not configured", 500);
    }

    const providedKey = extractMachineKey(request);
    if (!providedKey) {
      return unauthorizedResponse("Machine key required");
    }

    if (!isMachineKeyValid(providedKey, expectedKey)) {
      return unauthorizedResponse("Invalid machine key");
    }

    return handler(request, context);
  };
}
