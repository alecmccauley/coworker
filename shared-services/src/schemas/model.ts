import { z } from "zod";

const modelValueSchema = z
  .string()
  .min(1, "Model value is required")
  .max(200, "Model value must be 200 characters or less")
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "Model value is required"));

const modelTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(100, "Title must be 100 characters or less")
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "Title is required"));

export const createAiModelSchema = z.object({
  title: modelTitleSchema,
  value: modelValueSchema,
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const updateAiModelSchema = z.object({
  title: modelTitleSchema.optional(),
  value: modelValueSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const aiModelIdParamSchema = z.object({
  id: z.string().min(1, "Model ID is required"),
});

export type CreateAiModelSchemaInput = z.infer<typeof createAiModelSchema>;
export type UpdateAiModelSchemaInput = z.infer<typeof updateAiModelSchema>;
export type AiModelIdParamSchemaInput = z.infer<typeof aiModelIdParamSchema>;
