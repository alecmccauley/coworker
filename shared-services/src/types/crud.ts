/**
 * Base entity with common fields for all database entities
 */
export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Helper type to create input types by omitting auto-generated fields
 */
export type BaseCreateInput<T extends BaseEntity> = Omit<
  T,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Helper type for partial update inputs
 */
export type BaseUpdateInput<T extends BaseEntity> = Partial<BaseCreateInput<T>>;

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Common pagination query parameters
 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
