import type { ApiClient } from "../client.js";
import type {
  Feedback,
  CreateFeedbackInput,
} from "../../types/domain/feedback.js";
import { createFeedbackSchema } from "../../schemas/feedback.js";
import { parseWithSchema } from "../validation.js";

/**
 * Feedback endpoint for user feedback submissions
 */
export class FeedbackEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Submit feedback
   */
  async submit(data: CreateFeedbackInput): Promise<Feedback> {
    const parsed = parseWithSchema(createFeedbackSchema, data);
    return this.client.post<Feedback>("/api/v1/feedback", parsed);
  }
}
