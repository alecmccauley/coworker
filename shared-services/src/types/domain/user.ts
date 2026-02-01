import type { BaseEntity } from "../crud.js";

/**
 * User entity
 */
export interface User extends BaseEntity {
  email: string;
  name: string | null;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  email: string;
  name?: string;
}

/**
 * Input for updating an existing user
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
}
