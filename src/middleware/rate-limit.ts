import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

import { AppError } from "../lib/errors";

/**
 * Global rate limiting middleware.
 * Limits each IP to 1000 requests per 15-minute window.
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_request: Request, _response: Response, next: NextFunction) => {
    next(
      new AppError(
        429,
        "too_many_requests",
        "Too many requests from this IP. Please try again later."
      )
    );
  }
});
