import { ZodError, type ZodSchema } from "zod";

import { AppError } from "./errors";

export function parseWithSchema<TValue>(
  schema: ZodSchema<TValue>,
  value: unknown
): TValue {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(
        400,
        "validation_error",
        "Validation failed",
        error.flatten()
      );
    }

    throw error;
  }
}
