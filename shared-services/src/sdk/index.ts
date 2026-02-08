import { ApiClient, type ApiClientConfig } from "./client.js";
import { AuthEndpoint } from "./endpoints/auth.js";
import { ChatEndpoint } from "./endpoints/chat.js";
import { EventsEndpoint } from "./endpoints/events.js";
import { FeedbackEndpoint } from "./endpoints/feedback.js";
import { HelloEndpoint } from "./endpoints/hello.js";
import { ModelsEndpoint } from "./endpoints/models.js";
import { TemplatesEndpoint } from "./endpoints/templates.js";
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

  public readonly auth: AuthEndpoint;
  public readonly chat: ChatEndpoint;
  public readonly events: EventsEndpoint;
  public readonly feedback: FeedbackEndpoint;
  public readonly hello: HelloEndpoint;
  public readonly models: ModelsEndpoint;
  public readonly templates: TemplatesEndpoint;
  public readonly users: UsersEndpoint;

  constructor(config: CoworkerSdkConfig) {
    this.client = new ApiClient(config);
    this.auth = new AuthEndpoint(this.client);
    this.chat = new ChatEndpoint(this.client);
    this.events = new EventsEndpoint(this.client);
    this.feedback = new FeedbackEndpoint(this.client);
    this.hello = new HelloEndpoint(this.client);
    this.models = new ModelsEndpoint(this.client);
    this.templates = new TemplatesEndpoint(this.client);
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
