"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
const logger_1 = require("../lib/logger");
function notFoundHandler(_request, response) {
    response.status(404).json({
        error: {
            code: "not_found",
            message: "Resource not found"
        }
    });
}
function errorHandler(error, _request, response, _next) {
    if ((0, errors_1.isAppError)(error)) {
        response.status(error.statusCode).json({
            error: {
                code: error.code,
                message: error.message,
                details: error.details
            }
        });
        return;
    }
    if (error instanceof zod_1.ZodError) {
        response.status(400).json({
            error: {
                code: "validation_error",
                message: "Validation failed",
                details: error.flatten()
            }
        });
        return;
    }
    if (error instanceof SyntaxError &&
        "status" in error &&
        "type" in error &&
        error.status === 400 &&
        error.type === "entity.parse.failed") {
        response.status(400).json({
            error: {
                code: "invalid_json",
                message: "Request body contains invalid JSON"
            }
        });
        return;
    }
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            response.status(400).json({
                error: {
                    code: "file_too_large",
                    message: "Uploaded file exceeds the size limit"
                }
            });
            return;
        }
        response.status(400).json({
            error: {
                code: "multipart_error",
                message: error.message
            }
        });
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
            response.status(404).json({
                error: {
                    code: "resource_not_found",
                    message: "Requested resource was not found",
                    details: error.meta
                }
            });
            return;
        }
        if (error.code === "P2002") {
            response.status(409).json({
                error: {
                    code: "unique_constraint_violation",
                    message: "A unique constraint would be violated",
                    details: error.meta
                }
            });
            return;
        }
        if (error.code === "P2003") {
            response.status(409).json({
                error: {
                    code: "relation_constraint_violation",
                    message: "The requested change violates a relation constraint",
                    details: error.meta
                }
            });
            return;
        }
        response.status(400).json({
            error: {
                code: "prisma_error",
                message: error.message,
                details: error.meta
            }
        });
        return;
    }
    logger_1.logger.error("Unhandled error", error);
    response.status(500).json({
        error: {
            code: "internal_server_error",
            message: "An unexpected error occurred"
        }
    });
}
