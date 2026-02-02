import { z } from "zod";
import { authUserSchema } from "./auth.js";

/**
 * Schema for promote user response
 */
export const promoteUserResponseSchema = z.object({
  created: z.boolean(),
  user: authUserSchema,
});

export type PromoteUserResponse = z.infer<typeof promoteUserResponseSchema>;
