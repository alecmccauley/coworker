import type { ValidationError } from "../types/api.js";

/**
 * Base SDK error for all API-related errors
 */
export class SdkError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SdkError";
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when validation fails (400 Bad Request)
 */
export class ValidationSdkError extends SdkError {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = []) {
    super(message, 400);
    this.name = "ValidationSdkError";
    this.errors = errors;
  }
}

/**
 * Error thrown when a resource is not found (404 Not Found)
 */
export class NotFoundSdkError extends SdkError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundSdkError";
  }
}

/**
 * Error thrown when there's a network connectivity issue
 */
export class NetworkSdkError extends SdkError {
  constructor(message = "Network error occurred") {
    super(message, 0);
    this.name = "NetworkSdkError";
  }
}

/**
 * Error thrown when the server returns an unexpected error (5xx)
 */
export class ServerSdkError extends SdkError {
  constructor(message = "Server error occurred", statusCode = 500) {
    super(message, statusCode);
    this.name = "ServerSdkError";
  }
}

/**
 * Error thrown when authentication is required or token is invalid (401)
 */
export class AuthenticationSdkError extends SdkError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "AuthenticationSdkError";
  }
}

/**
 * Error thrown when rate limit is exceeded (429)
 */
export class RateLimitSdkError extends SdkError {
  public readonly retryAfter?: number;

  constructor(message = "Too many requests", retryAfter?: number) {
    super(message, 429);
    this.name = "RateLimitSdkError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when user is not found during auth
 */
export class UserNotFoundSdkError extends SdkError {
  constructor(message = "User not found for this email") {
    super(message, 404);
    this.name = "UserNotFoundSdkError";
  }
}

/**
 * Error thrown when verification code has expired
 */
export class CodeExpiredSdkError extends SdkError {
  constructor(message = "Verification code has expired") {
    super(message, 400);
    this.name = "CodeExpiredSdkError";
  }
}

/**
 * Error thrown when verification code is invalid
 */
export class CodeInvalidSdkError extends SdkError {
  public readonly attemptsRemaining?: number;

  constructor(message = "Invalid verification code", attemptsRemaining?: number) {
    super(message, 400);
    this.name = "CodeInvalidSdkError";
    this.attemptsRemaining = attemptsRemaining;
  }
}
