import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/errors";
import { resolveSession } from "../lib/session";

export async function attachAuth(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  const auth = await resolveSession(request);

  if (auth) {
    request.auth = auth;
  } else {
    delete request.auth;
  }

  next();
}

export function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (!request.auth) {
    next(new AppError(401, "unauthorized", "Authentication required"));
    return;
  }

  next();
}
