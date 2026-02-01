import type { z } from "zod";
import { ValidationSdkError } from "./errors.js";

export const parseWithSchema = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }));

  throw new ValidationSdkError("Validation failed", errors);
};
