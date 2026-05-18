import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        userId: string;
        role: Role;
        csrfToken: string;
      };
    }
  }
}

export {};
