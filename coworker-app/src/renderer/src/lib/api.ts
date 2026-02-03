/**
 * API helpers for the renderer process
 * These wrap the preload-exposed SDK methods for easier use in Svelte components
 */

/**
 * Hello API methods
 */
export const helloApi = {
  /**
   * Say hello to the API
   * @param name Optional name to greet
   */
  sayHello: (name?: string) => window.api.hello.sayHello(name),
};

/**
 * Users API methods
 */
export const usersApi = {
  /**
   * List all users
   */
  list: () => window.api.users.list(),

  /**
   * Get a user by ID
   */
  getById: (id: string) => window.api.users.getById(id),

  /**
   * Create a new user
   */
  create: (data: Parameters<typeof window.api.users.create>[0]) =>
    window.api.users.create(data),

  /**
   * Update an existing user
   */
  update: (id: string, data: Parameters<typeof window.api.users.update>[1]) =>
    window.api.users.update(id, data),

  /**
   * Delete a user
   */
  delete: (id: string) => window.api.users.delete(id),
};

/**
 * Combined API object for convenience
 */
export const api = {
  hello: helloApi,
  users: usersApi,
};
