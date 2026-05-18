"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.destroySession = destroySession;
exports.resolveSession = resolveSession;
const prisma_1 = require("./prisma");
const env_1 = require("../config/env");
const crypto_1 = require("./crypto");
const ids_1 = require("./ids");
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    secure: env_1.env.isProduction,
    path: "/"
};
const CSRF_COOKIE_OPTIONS = {
    httpOnly: false,
    sameSite: "lax",
    secure: env_1.env.isProduction,
    path: "/"
};
async function createSession(response, userId) {
    const rawSessionToken = (0, crypto_1.randomToken)(32);
    const rawCsrfToken = (0, crypto_1.randomToken)(24);
    const expiresAt = new Date(Date.now() + env_1.env.SESSION_TTL_HOURS * 60 * 60 * 1000);
    await prisma_1.prisma.session.create({
        data: {
            id: (0, ids_1.newId)(),
            userId,
            sessionTokenHash: (0, crypto_1.sha256)(rawSessionToken),
            csrfTokenHash: (0, crypto_1.sha256)(rawCsrfToken),
            expiresAt
        }
    });
    response.cookie(env_1.env.SESSION_COOKIE_NAME, rawSessionToken, {
        ...SESSION_COOKIE_OPTIONS,
        expires: expiresAt
    });
    response.cookie(env_1.env.CSRF_COOKIE_NAME, rawCsrfToken, {
        ...CSRF_COOKIE_OPTIONS,
        expires: expiresAt
    });
    return rawCsrfToken;
}
async function destroySession(response, rawSessionToken) {
    if (rawSessionToken) {
        await prisma_1.prisma.session
            .deleteMany({
            where: {
                sessionTokenHash: (0, crypto_1.sha256)(rawSessionToken)
            }
        })
            .catch(() => undefined);
    }
    response.clearCookie(env_1.env.SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
    response.clearCookie(env_1.env.CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS);
}
async function resolveSession(request) {
    const rawSessionToken = request.cookies?.[env_1.env.SESSION_COOKIE_NAME];
    const rawCsrfToken = request.cookies?.[env_1.env.CSRF_COOKIE_NAME];
    if (!rawSessionToken || !rawCsrfToken) {
        return undefined;
    }
    const session = await prisma_1.prisma.session.findUnique({
        where: {
            sessionTokenHash: (0, crypto_1.sha256)(rawSessionToken)
        },
        include: {
            user: true
        }
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
        return undefined;
    }
    if (session.csrfTokenHash !== (0, crypto_1.sha256)(rawCsrfToken)) {
        return undefined;
    }
    return {
        sessionId: session.id,
        userId: session.userId,
        role: session.user.role,
        csrfToken: rawCsrfToken
    };
}
