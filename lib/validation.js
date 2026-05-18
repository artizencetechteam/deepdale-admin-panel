"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithSchema = parseWithSchema;
const zod_1 = require("zod");
const errors_1 = require("./errors");
function parseWithSchema(schema, value) {
    try {
        return schema.parse(value);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            throw new errors_1.AppError(400, "validation_error", "Validation failed", error.flatten());
        }
        throw error;
    }
}
