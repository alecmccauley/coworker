import type { ApiClient } from "../client.js";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
} from "../../types/domain/user.js";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../../schemas/user.js";
import { parseWithSchema } from "../validation.js";

/**
 * Users endpoint for user CRUD operations
 */
export class UsersEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * List all users
   */
  async list(): Promise<User[]> {
    return this.client.get<User[]>("/api/v1/users");
  }

  /**
   * Get a user by ID
   */
  async getById(id: string): Promise<User> {
    const parsed = parseWithSchema(userIdParamSchema, { id });
    return this.client.get<User>(`/api/v1/users/${parsed.id}`);
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserInput): Promise<User> {
    const parsed = parseWithSchema(createUserSchema, data);
    return this.client.post<User>("/api/v1/users", parsed);
  }

  /**
   * Update an existing user
   */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    const parsedParams = parseWithSchema(userIdParamSchema, { id });
    const parsedBody = parseWithSchema(updateUserSchema, data);
    return this.client.patch<User>(`/api/v1/users/${parsedParams.id}`, parsedBody);
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    const parsed = parseWithSchema(userIdParamSchema, { id });
    await this.client.delete<unknown>(`/api/v1/users/${parsed.id}`);
  }
}
