import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ZodError } from "zod";

import { isAppError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({
    error: {
      code: "not_found",
      message: "Resource not found"
    }
  });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (isAppError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "validation_error",
        message: "Validation failed",
        details: error.flatten()
      }
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    "type" in error &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({
      error: {
        code: "invalid_json",
        message: "Request body contains invalid JSON"
      }
    });
    return;
  }

  if (error instanceof multer.MulterError) {
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

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

  logger.error("Unhandled error", error);
  response.status(500).json({
    error: {
      code: "internal_server_error",
      message: "An unexpected error occurred"
    }
  });
}
