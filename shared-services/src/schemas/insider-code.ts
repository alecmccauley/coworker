import { z } from "zod";

const insiderCodeRegex = /^[a-z0-9]+$/;

export const createInsiderCodeSchema = z.object({
  code: z
    .string()
    .min(6, "Code must be at least 6 characters")
    .max(25, "Code must be 25 characters or less")
    .regex(insiderCodeRegex, "Code must be lowercase letters and numbers only")
    .transform((s) => s.toLowerCase()),
  title: z.string().min(1, "Title is required").max(100),
  notes: z.preprocess(
    (val) =>
      typeof val === "string" && val.trim().length === 0 ? undefined : val,
    z.string().optional()
  ),
  isActive: z.boolean().optional(),
});

export const updateInsiderCodeSchema = z.object({
  code: z
    .string()
    .min(6)
    .max(25)
    .regex(insiderCodeRegex, "Code must be lowercase letters and numbers only")
    .transform((s) => s.toLowerCase())
    .optional(),
  title: z.string().min(1).max(100).optional(),
  notes: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  isActive: z.boolean().optional(),
});

export const validateInsiderCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .transform((s) => s.toLowerCase().trim()),
});

export const insiderSignUpSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .transform((s) => s.toLowerCase().trim()),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .transform((s) => s.toLowerCase().trim()),
});

export type CreateInsiderCodeSchemaInput = z.infer<
  typeof createInsiderCodeSchema
>;
export type UpdateInsiderCodeSchemaInput = z.infer<
  typeof updateInsiderCodeSchema
>;
export type ValidateInsiderCodeSchemaInput = z.infer<
  typeof validateInsiderCodeSchema
>;
export type InsiderSignUpSchemaInput = z.infer<typeof insiderSignUpSchema>;
