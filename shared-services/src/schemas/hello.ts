import { z } from "zod";

/**
 * Schema for validating hello endpoint query parameters
 */
export const helloQuerySchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
});

export type HelloQueryInput = z.infer<typeof helloQuerySchema>;
