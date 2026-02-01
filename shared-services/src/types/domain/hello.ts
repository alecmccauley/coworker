/**
 * Query parameters for the hello endpoint
 */
export interface HelloQuery {
  name?: string;
}

/**
 * Response data from the hello endpoint
 */
export interface HelloData {
  message: string;
  timestamp: string;
}
