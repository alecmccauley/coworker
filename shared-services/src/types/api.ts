/**
 * Validation error detail for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Successful API response envelope
 */
export interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
}

/**
 * Error API response envelope
 */
export interface ApiErrorResponse {
  status: "error";
  message: string;
  errors?: ValidationError[];
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.status === "success";
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.status === "error";
}
