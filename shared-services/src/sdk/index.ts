import { ApiClient, type ApiClientConfig } from "./client.js";
import { HelloEndpoint } from "./endpoints/hello.js";
import { UsersEndpoint } from "./endpoints/users.js";

export * from "./errors.js";
export * from "./client.js";
export * from "./endpoints/index.js";

export type CoworkerSdkConfig = ApiClientConfig;

/**
 * Main SDK class providing access to all API endpoints
 */
export class CoworkerSdk {
  private readonly client: ApiClient;

  public readonly hello: HelloEndpoint;
  public readonly users: UsersEndpoint;

  constructor(config: CoworkerSdkConfig) {
    this.client = new ApiClient(config);
    this.hello = new HelloEndpoint(this.client);
    this.users = new UsersEndpoint(this.client);
  }
}

/**
 * Create a new SDK instance
 */
export function createSdk(config: CoworkerSdkConfig): CoworkerSdk {
  return new CoworkerSdk(config);
}

/**
 * Create a development SDK instance pointing to localhost:3000
 */
export function createDevSdk(): CoworkerSdk {
  return new CoworkerSdk({
    baseUrl: "http://localhost:3000",
  });
}
