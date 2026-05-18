import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";

import { AppError } from "../lib/errors";

export function requireRole(...allowedRoles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const role = request.auth?.role;

    if (!role || !allowedRoles.includes(role)) {
      next(
        new AppError(
          403,
          "forbidden",
          "You do not have permission for this action"
        )
      );
      return;
    }

    next();
  };
}
