import type { Request, Response } from "express";

import { prisma } from "./prisma";
import { env } from "../config/env";
import { randomToken, sha256 } from "./crypto";
import { newId } from "./ids";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction,
  path: "/"
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: env.isProduction,
  path: "/"
};

export async function createSession(
  response: Response,
  userId: string
): Promise<string> {
  const rawSessionToken = randomToken(32);
  const rawCsrfToken = randomToken(24);
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      id: newId(),
      userId,
      sessionTokenHash: sha256(rawSessionToken),
      csrfTokenHash: sha256(rawCsrfToken),
      expiresAt
    }
  });

  response.cookie(env.SESSION_COOKIE_NAME, rawSessionToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt
  });
  response.cookie(env.CSRF_COOKIE_NAME, rawCsrfToken, {
    ...CSRF_COOKIE_OPTIONS,
    expires: expiresAt
  });

  return rawCsrfToken;
}

export async function destroySession(
  response: Response,
  rawSessionToken?: string
): Promise<void> {
  if (rawSessionToken) {
    await prisma.session
      .deleteMany({
        where: {
          sessionTokenHash: sha256(rawSessionToken)
        }
      })
      .catch(() => undefined);
  }

  response.clearCookie(env.SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  response.clearCookie(env.CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS);
}

export async function resolveSession(
  request: Request
): Promise<Express.Request["auth"] | undefined> {
  const rawSessionToken = request.cookies?.[env.SESSION_COOKIE_NAME];
  const rawCsrfToken = request.cookies?.[env.CSRF_COOKIE_NAME];

  if (!rawSessionToken || !rawCsrfToken) {
    return undefined;
  }

  const session = await prisma.session.findUnique({
    where: {
      sessionTokenHash: sha256(rawSessionToken)
    },
    include: {
      user: true
    }
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    return undefined;
  }

  if (session.csrfTokenHash !== sha256(rawCsrfToken)) {
    return undefined;
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.user.role,
    csrfToken: rawCsrfToken
  };
}
