"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsersRouter = createUsersRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const validation_1 = require("../../lib/validation");
const passwords_1 = require("../../lib/passwords");
const csrf_1 = require("../../middleware/csrf");
const roles_1 = require("../../middleware/roles");
const ids_1 = require("../../lib/ids");
const errors_1 = require("../../lib/errors");
const activity_log_1 = require("../../lib/activity-log");
const userCreateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().trim().min(1).max(120),
    role: zod_1.z.enum(["superadmin", "admin", "editor", "viewer"]),
    password: zod_1.z.string().min(8),
    isActive: zod_1.z.boolean().default(true)
});
const userUpdateSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    name: zod_1.z.string().trim().min(1).max(120).optional(),
    role: zod_1.z.enum(["superadmin", "admin", "editor", "viewer"]).optional(),
    isActive: zod_1.z.boolean().optional()
});
const setPasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(8)
});
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
async function assertUserUpdateAllowed(actorUserId, targetUserId, input) {
    if (input.role === undefined && input.isActive === undefined) {
        return;
    }
    const existingUser = await prisma_1.prisma.user.findUniqueOrThrow({
        where: {
            id: targetUserId
        }
    });
    const nextRole = input.role ?? existingUser.role;
    const nextIsActive = input.isActive ?? existingUser.isActive;
    const removesSuperadminAccess = existingUser.role === "superadmin" &&
        existingUser.isActive &&
        (nextRole !== "superadmin" || !nextIsActive);
    if (existingUser.id === actorUserId && removesSuperadminAccess) {
        throw new errors_1.AppError(400, "self_lockout_forbidden", "You cannot remove your own active superadmin access");
    }
    if (removesSuperadminAccess) {
        const activeSuperadminCount = await prisma_1.prisma.user.count({
            where: {
                role: "superadmin",
                isActive: true
            }
        });
        if (activeSuperadminCount <= 1) {
            throw new errors_1.AppError(400, "last_superadmin_forbidden", "At least one active superadmin must remain");
        }
    }
}
function createUsersRouter() {
    const router = (0, express_1.Router)();
    router.use((0, roles_1.requireRole)("superadmin"));
    router.get("/", async (_request, response) => {
        const users = await prisma_1.prisma.user.findMany({
            orderBy: {
                createdAt: "asc"
            }
        });
        response.json({
            data: users.map(serializeUser)
        });
    });
    router.post("/", csrf_1.requireCsrf, async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(userCreateSchema, request.body);
        const user = await prisma_1.prisma.user.create({
            data: {
                id: (0, ids_1.newId)(),
                email: input.email.toLowerCase().trim(),
                name: input.name.trim(),
                role: input.role,
                isActive: input.isActive ?? true,
                passwordHash: await (0, passwords_1.hashPassword)(input.password)
            }
        });
        await (0, activity_log_1.recordActivity)({
            request,
            action: "create",
            resourceType: "users",
            resourceId: user.id,
            resourceLabel: user.email,
            summary: `Created user: ${user.email}`,
            metadata: {
                role: user.role,
                isActive: user.isActive
            }
        });
        response.status(201).json({
            data: serializeUser(user)
        });
    });
    router.patch("/:id", csrf_1.requireCsrf, async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(userUpdateSchema, request.body);
        const id = String(request.params.id ?? "");
        const data = {};
        await assertUserUpdateAllowed(request.auth?.userId, id, input);
        if (input.email !== undefined) {
            data.email = input.email.toLowerCase().trim();
        }
        if (input.name !== undefined) {
            data.name = input.name.trim();
        }
        if (input.role !== undefined) {
            data.role = input.role;
        }
        if (input.isActive !== undefined) {
            data.isActive = input.isActive;
        }
        const user = await prisma_1.prisma.user.update({
            where: {
                id
            },
            data
        });
        await (0, activity_log_1.recordActivity)({
            request,
            action: "update",
            resourceType: "users",
            resourceId: user.id,
            resourceLabel: user.email,
            summary: `Updated user: ${user.email}`,
            metadata: {
                role: user.role,
                isActive: user.isActive
            }
        });
        response.json({
            data: serializeUser(user)
        });
    });
    router.post("/:id/set-password", csrf_1.requireCsrf, async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(setPasswordSchema, request.body);
        const id = String(request.params.id ?? "");
        const user = await prisma_1.prisma.user.update({
            where: {
                id
            },
            data: {
                passwordHash: await (0, passwords_1.hashPassword)(input.password)
            }
        });
        await (0, activity_log_1.recordActivity)({
            request,
            action: "set_password",
            resourceType: "users",
            resourceId: user.id,
            summary: `Reset password for user: ${id}`
        });
        response.status(204).send();
    });
    return router;
}
