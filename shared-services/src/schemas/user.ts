import { z } from "zod";

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().min(1, "Name is required").optional(),
});

/**
 * Schema for updating an existing user
 */
export const updateUserSchema = z.object({
  email: z.email("Invalid email address").optional(),
  name: z.string().min(1, "Name is required").optional(),
});

/**
 * Schema for validating user ID parameter
 */
export const userIdParamSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

/**
 * Schema for listing users with pagination and search
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export type CreateUserSchemaInput = z.infer<typeof createUserSchema>;
export type UpdateUserSchemaInput = z.infer<typeof updateUserSchema>;
export type UserIdParamSchemaInput = z.infer<typeof userIdParamSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
