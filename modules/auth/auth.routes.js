"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = createAuthRouter;
const express_1 = require("express");
const session_1 = require("../../lib/session");
const prisma_1 = require("../../lib/prisma");
const validation_1 = require("../../lib/validation");
const errors_1 = require("../../lib/errors");
const passwords_1 = require("../../lib/passwords");
const ids_1 = require("../../lib/ids");
const auth_1 = require("../../middleware/auth");
const csrf_1 = require("../../middleware/csrf");
const env_1 = require("../../config/env");
const zod_1 = require("zod");
const activity_log_1 = require("../../lib/activity-log");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
function getRequestIp(request) {
    const forwarded = request.header("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return request.ip || "unknown";
}
async function assertLoginAllowed(email, ipAddress) {
    const cutoff = new Date(Date.now() - env_1.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentFailedAttempts = await prisma_1.prisma.loginAttempt.count({
        where: {
            attemptedAt: {
                gte: cutoff
            },
            succeeded: false,
            OR: [{ email }, { ipAddress }]
        }
    });
    if (recentFailedAttempts >= env_1.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
        throw new errors_1.AppError(429, "login_rate_limited", "Too many failed login attempts. Please try again later.");
    }
}
async function recordLoginAttempt(email, ipAddress, succeeded) {
    await prisma_1.prisma.loginAttempt.create({
        data: {
            id: (0, ids_1.newId)(),
            email,
            ipAddress,
            succeeded
        }
    });
}
function serializeUser(user) {
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
function createAuthRouter() {
    const router = (0, express_1.Router)();
    router.post("/login", async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(loginSchema, request.body);
        const email = input.email.toLowerCase().trim();
        const ipAddress = getRequestIp(request);
        await assertLoginAllowed(email, ipAddress);
        const user = await prisma_1.prisma.user.findUnique({
            where: {
                email
            }
        });
        if (!user || !user.isActive) {
            await recordLoginAttempt(email, ipAddress, false);
            throw new errors_1.AppError(401, "invalid_credentials", "Invalid email or password");
        }
        const matches = await (0, passwords_1.verifyPassword)(input.password, user.passwordHash);
        if (!matches) {
            await recordLoginAttempt(email, ipAddress, false);
            throw new errors_1.AppError(401, "invalid_credentials", "Invalid email or password");
        }
        const lastLoginAt = new Date();
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt
            }
        });
        const csrfToken = await (0, session_1.createSession)(response, user.id);
        await recordLoginAttempt(email, ipAddress, true);
        await (0, activity_log_1.recordActivity)({
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
    router.post("/logout", auth_1.requireAuth, csrf_1.requireCsrf, async (request, response) => {
        await (0, activity_log_1.recordActivity)({
            request,
            action: "logout",
            resourceType: "auth-session",
            resourceId: request.auth?.userId ?? null,
            summary: "Signed out of admin"
        });
        await (0, session_1.destroySession)(response, request.cookies?.[env_1.env.SESSION_COOKIE_NAME]);
        response.status(204).send();
    });
    router.get("/me", auth_1.requireAuth, async (request, response) => {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({
            where: {
                id: request.auth.userId
            }
        });
        response.json({
            data: serializeUser(user)
        });
    });
    router.get("/csrf", auth_1.requireAuth, async (request, response) => {
        response.json({
            data: {
                csrfToken: request.auth.csrfToken
            }
        });
    });
    return router;
}
