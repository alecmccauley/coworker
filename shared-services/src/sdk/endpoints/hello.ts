import type { ApiClient } from "../client.js";
import type { HelloData, HelloQuery } from "../../types/domain/hello.js";
import { helloQuerySchema } from "../../schemas/hello.js";
import { parseWithSchema } from "../validation.js";

/**
 * Hello endpoint for testing API connectivity
 */
export class HelloEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Say hello to the API
   * @param query Optional query parameters (name)
   * @returns Hello greeting with timestamp
   */
  async sayHello(query?: HelloQuery): Promise<HelloData> {
    const parsedQuery = query
      ? parseWithSchema(helloQuerySchema, query)
      : undefined;

    return this.client.get<HelloData>(
      "/api/v1/hello",
      parsedQuery as Record<string, unknown> | undefined
    );
  }
}
