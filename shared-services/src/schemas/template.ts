import { z } from "zod";

/**
 * Schema for coworker default behaviors
 */
export const coworkerDefaultBehaviorsSchema = z.object({
  tone: z.string().optional(),
  formatting: z.string().optional(),
  guardrails: z.array(z.string()).optional(),
});

/**
 * Schema for coworker tools policy
 */
export const coworkerToolsPolicySchema = z.object({
  allowedCategories: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
});

/**
 * Schema for model routing policy (internal)
 */
export const coworkerModelRoutingPolicySchema = z.object({
  preferredModel: z.string().optional(),
  fallbackModel: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalize user input to a valid slug: trim, lowercase, spaces to hyphens, strip invalid chars.
 */
function normalizeSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const slugSchema = z
  .string()
  .transform(normalizeSlug)
  .pipe(
    z
      .string()
      .min(1, "Slug is required")
      .max(50, "Slug must be 50 characters or less")
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens")
  );

/**
 * Schema for creating a new coworker template
 */
export const createCoworkerTemplateSchema = z.object({
  slug: slugSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  rolePrompt: z
    .string()
    .min(1, "Role prompt is required")
    .max(10000, "Role prompt must be 10000 characters or less"),
  defaultBehaviors: coworkerDefaultBehaviorsSchema.optional(),
  defaultToolsPolicy: coworkerToolsPolicySchema.optional(),
  modelRoutingPolicy: coworkerModelRoutingPolicySchema.optional(),
  isPublished: z.boolean().optional(),
});

/**
 * Schema for updating an existing coworker template.
 * Slug is optional; empty string is treated as undefined (no change).
 */
export const updateCoworkerTemplateSchema = z.object({
  slug: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      if (typeof val !== "string") return undefined;
      const normalized = normalizeSlug(val);
      return normalized === "" ? undefined : normalized;
    },
    z
      .string()
      .min(1, "Slug is required")
      .max(50, "Slug must be 50 characters or less")
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens")
      .optional()
  ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  description: z.string().max(500, "Description must be 500 characters or less").nullable().optional(),
  rolePrompt: z
    .string()
    .min(1, "Role prompt is required")
    .max(10000, "Role prompt must be 10000 characters or less")
    .optional(),
  defaultBehaviors: coworkerDefaultBehaviorsSchema.nullable().optional(),
  defaultToolsPolicy: coworkerToolsPolicySchema.nullable().optional(),
  modelRoutingPolicy: coworkerModelRoutingPolicySchema.nullable().optional(),
  isPublished: z.boolean().optional(),
});

/**
 * Schema for template ID parameter
 */
export const templateIdParamSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
});

/**
 * Schema for listing templates with optional filters
 */
export const listTemplatesQuerySchema = z.object({
  published: z.coerce.boolean().optional(),
});

export type CreateCoworkerTemplateSchemaInput = z.infer<typeof createCoworkerTemplateSchema>;
export type UpdateCoworkerTemplateSchemaInput = z.infer<typeof updateCoworkerTemplateSchema>;
export type TemplateIdParamSchemaInput = z.infer<typeof templateIdParamSchema>;
export type ListTemplatesQueryInput = z.infer<typeof listTemplatesQuerySchema>;
