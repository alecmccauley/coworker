import { z } from "zod";

export const feedbackTypeSchema = z.enum(["bug", "improvement", "like"]);

const screenshotSchema = z.object({
  dataBase64: z
    .string()
    .min(1, "Screenshot data is required")
    .transform((value) => value.trim()),
  mime: z.string().min(1, "Screenshot mime type is required"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  byteSize: z.number().int().positive(),
  capturedAt: z.string().datetime(),
});

export const createFeedbackSchema = z.object({
  type: feedbackTypeSchema,
  message: z
    .string()
    .min(1, "Feedback message is required")
    .max(4000, "Feedback message must be 4000 characters or less")
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Feedback message is required")),
  canContact: z.boolean().default(true),
  includeScreenshot: z.boolean().default(false),
  screenshot: screenshotSchema.optional(),
});

export type FeedbackTypeSchemaInput = z.infer<typeof feedbackTypeSchema>;
export type CreateFeedbackSchemaInput = z.infer<typeof createFeedbackSchema>;
