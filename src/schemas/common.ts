import { z } from "zod";

import { GRADIENT_PRESET_TOKENS } from "../constants/gradient-presets";
import { KNOWN_ICON_NAME_SET } from "../constants/icons";

export const idSchema = z.string().min(1).max(100);
export const optionalUrlSchema = z
  .string()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));
export const requiredUrlSchema = z.string().url();
export const sortOrderSchema = z.coerce.number().int().min(0);
export const simpleTextSchema = z.string().trim().min(1).max(500);
export const longTextSchema = z.string().trim().min(1).max(10_000);
export const gradientPresetSchema = z
  .string()
  .refine(
    (value) => (GRADIENT_PRESET_TOKENS as Set<string>).has(value),
    "Unknown gradient preset"
  );
export const iconNameSchema = z
  .string()
  .refine(
    (value) => (KNOWN_ICON_NAME_SET as Set<string>).has(value),
    "Unknown icon name"
  );
export const reorderSchema = z.array(
  z.object({
    id: idSchema,
    sortOrder: sortOrderSchema
  })
);
