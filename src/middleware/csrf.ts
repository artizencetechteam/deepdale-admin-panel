import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { AppError } from "../lib/errors";

export function requireCsrf(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  const headerToken = request.header("x-csrf-token");
  const cookieToken = request.cookies?.[env.CSRF_COOKIE_NAME];
  const sessionToken = request.auth?.csrfToken;

  if (!headerToken || !cookieToken || !sessionToken) {
    next(new AppError(403, "csrf_missing", "CSRF token is required"));
    return;
  }

  if (headerToken !== cookieToken || headerToken !== sessionToken) {
    next(new AppError(403, "csrf_invalid", "Invalid CSRF token"));
    return;
  }

  next();
}
