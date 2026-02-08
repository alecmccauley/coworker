import { z } from "zod";

export const eventTypeEnum = z.enum(["user.sign_in", "workspace.created"]);

export const createEventSchema = z.object({
  type: eventTypeEnum,
  userId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const trackEventSchema = z.object({
  type: eventTypeEnum,
  details: z.record(z.string(), z.unknown()).optional(),
});

export const signInEventDetailsSchema = z.object({
  email: z.string(),
  name: z.string().nullable(),
  authCodeId: z.string(),
  attempts: z.number().int().nonnegative(),
});

export const workspaceCreatedDetailsSchema = z.object({
  workspaceName: z.string(),
});

export type EventType = z.infer<typeof eventTypeEnum>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type SignInEventDetailsInput = z.infer<typeof signInEventDetailsSchema>;
