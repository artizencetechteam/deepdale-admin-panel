"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderSchema = exports.iconNameSchema = exports.gradientPresetSchema = exports.longTextSchema = exports.simpleTextSchema = exports.sortOrderSchema = exports.requiredUrlSchema = exports.optionalUrlSchema = exports.idSchema = void 0;
const zod_1 = require("zod");
const gradient_presets_1 = require("../constants/gradient-presets");
const icons_1 = require("../constants/icons");
exports.idSchema = zod_1.z.string().min(1).max(100);
exports.optionalUrlSchema = zod_1.z
    .string()
    .url()
    .optional()
    .or(zod_1.z.literal("").transform(() => undefined));
exports.requiredUrlSchema = zod_1.z.string().url();
exports.sortOrderSchema = zod_1.z.coerce.number().int().min(0);
exports.simpleTextSchema = zod_1.z.string().trim().min(1).max(500);
exports.longTextSchema = zod_1.z.string().trim().min(1).max(10_000);
exports.gradientPresetSchema = zod_1.z
    .string()
    .refine((value) => gradient_presets_1.GRADIENT_PRESET_TOKENS.has(value), "Unknown gradient preset");
exports.iconNameSchema = zod_1.z
    .string()
    .refine((value) => icons_1.KNOWN_ICON_NAME_SET.has(value), "Unknown icon name");
exports.reorderSchema = zod_1.z.array(zod_1.z.object({
    id: exports.idSchema,
    sortOrder: exports.sortOrderSchema
}));
