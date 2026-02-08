import type { ApiClient } from "../client.js";
import type { Event } from "../../types/domain/event.js";
import type { TrackEventInput } from "../../schemas/event.js";
import { trackEventSchema } from "../../schemas/event.js";
import { parseWithSchema } from "../validation.js";

/**
 * Events endpoint for client-side event tracking
 */
export class EventsEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Track an event
   */
  async track(data: TrackEventInput): Promise<Event> {
    const parsed = parseWithSchema(trackEventSchema, data);
    return this.client.post<Event>("/api/v1/events", parsed);
  }
}
