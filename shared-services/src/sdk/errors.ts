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
