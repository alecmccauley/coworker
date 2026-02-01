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

export type CreateUserSchemaInput = z.infer<typeof createUserSchema>;
export type UpdateUserSchemaInput = z.infer<typeof updateUserSchema>;
export type UserIdParamSchemaInput = z.infer<typeof userIdParamSchema>;
