import { Router } from "express";

import { createSession, destroySession } from "../../lib/session";
import { prisma } from "../../lib/prisma";
import { parseWithSchema } from "../../lib/validation";
import { AppError } from "../../lib/errors";
import { verifyPassword } from "../../lib/passwords";
import { newId } from "../../lib/ids";
import { requireAuth } from "../../middleware/auth";
import { requireCsrf } from "../../middleware/csrf";
import { env } from "../../config/env";
import { z } from "zod";
import { recordActivity } from "../../lib/activity-log";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function getRequestIp(
  request: Parameters<typeof Router>[0] extends never ? never : any
): string {
  const forwarded = request.header("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }

  return request.ip || "unknown";
}

async function assertLoginAllowed(
  email: string,
  ipAddress: string
): Promise<void> {
  const cutoff = new Date(
    Date.now() - env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  );

  const recentFailedAttempts = await prisma.loginAttempt.count({
    where: {
      attemptedAt: {
        gte: cutoff
      },
      succeeded: false,
      OR: [{ email }, { ipAddress }]
    }
  });

  if (recentFailedAttempts >= env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    throw new AppError(
      429,
      "login_rate_limited",
      "Too many failed login attempts. Please try again later."
    );
  }
}

async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  succeeded: boolean
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      id: newId(),
      email,
      ipAddress,
      succeeded
    }
  });
}

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", async (request, response) => {
    const input = parseWithSchema(loginSchema, request.body);
    const email = input.email.toLowerCase().trim();
    const ipAddress = getRequestIp(request);

    await assertLoginAllowed(email, ipAddress);

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user || !user.isActive) {
      await recordLoginAttempt(email, ipAddress, false);
      throw new AppError(
        401,
        "invalid_credentials",
        "Invalid email or password"
      );
    }

    const matches = await verifyPassword(input.password, user.passwordHash);

    if (!matches) {
      await recordLoginAttempt(email, ipAddress, false);
      throw new AppError(
        401,
        "invalid_credentials",
        "Invalid email or password"
      );
    }

    const lastLoginAt = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt
      }
    });

    const csrfToken = await createSession(response, user.id);
    await recordLoginAttempt(email, ipAddress, true);
    await recordActivity({
      actorUserId: user.id,
      actorRole: user.role,
      action: "login",
      resourceType: "auth-session",
      resourceId: user.id,
      resourceLabel: user.email,
      summary: `Signed in as ${user.email}`,
      ipAddress
    });

    response.json({
      data: {
        user: serializeUser({
          ...user,
          lastLoginAt
        }),
        csrfToken
      }
    });
  });

  router.post(
    "/logout",
    requireAuth,
    requireCsrf,
    async (request, response) => {
      await recordActivity({
        request,
        action: "logout",
        resourceType: "auth-session",
        resourceId: request.auth?.userId ?? null,
        summary: "Signed out of admin"
      });
      await destroySession(
        response,
        request.cookies?.[env.SESSION_COOKIE_NAME]
      );
      response.status(204).send();
    }
  );

  router.get("/me", requireAuth, async (request, response) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: request.auth!.userId
      }
    });

    response.json({
      data: serializeUser(user)
    });
  });

  router.get("/csrf", requireAuth, async (request, response) => {
    response.json({
      data: {
        csrfToken: request.auth!.csrfToken
      }
    });
  });

  return router;
}
