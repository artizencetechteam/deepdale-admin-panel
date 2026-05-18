import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { parseWithSchema } from "../../lib/validation";
import { hashPassword } from "../../lib/passwords";
import { requireCsrf } from "../../middleware/csrf";
import { requireRole } from "../../middleware/roles";
import { newId } from "../../lib/ids";
import { AppError } from "../../lib/errors";
import { recordActivity } from "../../lib/activity-log";

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["superadmin", "admin", "editor", "viewer"]),
  password: z.string().min(8),
  isActive: z.boolean().default(true)
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["superadmin", "admin", "editor", "viewer"]).optional(),
  isActive: z.boolean().optional()
});

const setPasswordSchema = z.object({
  password: z.string().min(8)
});

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

async function assertUserUpdateAllowed(
  actorUserId: string | undefined,
  targetUserId: string,
  input: z.infer<typeof userUpdateSchema>
): Promise<void> {
  if (input.role === undefined && input.isActive === undefined) {
    return;
  }

  const existingUser = await prisma.user.findUniqueOrThrow({
    where: {
      id: targetUserId
    }
  });
  const nextRole = input.role ?? existingUser.role;
  const nextIsActive = input.isActive ?? existingUser.isActive;
  const removesSuperadminAccess =
    existingUser.role === "superadmin" &&
    existingUser.isActive &&
    (nextRole !== "superadmin" || !nextIsActive);

  if (existingUser.id === actorUserId && removesSuperadminAccess) {
    throw new AppError(
      400,
      "self_lockout_forbidden",
      "You cannot remove your own active superadmin access"
    );
  }

  if (removesSuperadminAccess) {
    const activeSuperadminCount = await prisma.user.count({
      where: {
        role: "superadmin",
        isActive: true
      }
    });

    if (activeSuperadminCount <= 1) {
      throw new AppError(
        400,
        "last_superadmin_forbidden",
        "At least one active superadmin must remain"
      );
    }
  }
}

export function createUsersRouter(): Router {
  const router = Router();

  router.use(requireRole("superadmin"));

  router.get("/", async (_request, response) => {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "asc"
      }
    });

    response.json({
      data: users.map(serializeUser)
    });
  });

  router.post("/", requireCsrf, async (request, response) => {
    const input = parseWithSchema(userCreateSchema, request.body);
    const user = await prisma.user.create({
      data: {
        id: newId(),
        email: input.email.toLowerCase().trim(),
        name: input.name.trim(),
        role: input.role,
        isActive: input.isActive ?? true,
        passwordHash: await hashPassword(input.password)
      }
    });

    await recordActivity({
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

  router.patch("/:id", requireCsrf, async (request, response) => {
    const input = parseWithSchema(userUpdateSchema, request.body);
    const id = String(request.params.id ?? "");
    const data: Record<string, unknown> = {};

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

    const user = await prisma.user.update({
      where: {
        id
      },
      data
    });

    await recordActivity({
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

  router.post("/:id/set-password", requireCsrf, async (request, response) => {
    const input = parseWithSchema(setPasswordSchema, request.body);
    const id = String(request.params.id ?? "");
    const user = await prisma.user.update({
      where: {
        id
      },
      data: {
        passwordHash: await hashPassword(input.password)
      }
    });

    await recordActivity({
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
