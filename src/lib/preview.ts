import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../config/env";

const PREVIEW_TOKEN_TTL_MINUTES = 30;

type PreviewTokenPayload = {
  userId: string;
  role: string;
  exp: number;
};

export type PreviewContext = {
  requestedByUserId: string;
  role: string;
  expiresAt: string;
};

function signPreviewToken(encodedPayload: string) {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

export function createPreviewToken(input: {
  userId: string;
  role: string;
}): PreviewContext & { token: string } {
  const exp = Date.now() + PREVIEW_TOKEN_TTL_MINUTES * 60 * 1000;
  const payload: PreviewTokenPayload = {
    userId: input.userId,
    role: input.role,
    exp
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPreviewToken(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    requestedByUserId: input.userId,
    role: input.role,
    expiresAt: new Date(exp).toISOString()
  };
}

export function verifyPreviewToken(token: string): PreviewContext | null {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPreviewToken(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as PreviewTokenPayload;

    if (
      !payload.userId ||
      !payload.role ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }

    return {
      requestedByUserId: payload.userId,
      role: payload.role,
      expiresAt: new Date(payload.exp).toISOString()
    };
  } catch {
    return null;
  }
}
