import { Router } from "express";
import { z } from "zod";

import { ACTIVITY_ACTIONS, listActivityLog } from "../../lib/activity-log";
import { prisma } from "../../lib/prisma";
import { requireRole } from "../../middleware/roles";
import { parseWithSchema } from "../../lib/validation";

const activityLogQuerySchema = z.object({
  action: z.enum(ACTIVITY_ACTIONS).optional(),
  resourceType: z.string().trim().min(1).max(120).optional(),
  userId: z.string().trim().min(1).max(120).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export function createActivityLogRouter(): Router {
  const router = Router();

  router.get(
    "/meta/resource-types",
    requireRole("viewer", "admin", "superadmin"),
    async (_request, response) => {
      const types = await prisma.activityLog.findMany({
        select: { resourceType: true },
        distinct: ["resourceType"],
        orderBy: { resourceType: "asc" }
      });

      response.json({
        data: types.map((t: { resourceType: string }) => t.resourceType)
      });
    }
  );

  router.get(
    "/",
    requireRole("admin", "superadmin"),
    async (request, response) => {
      const query = parseWithSchema(activityLogQuerySchema, request.query);
      const entries = await listActivityLog({
        ...(query.action ? { action: query.action } : {}),
        ...(query.resourceType ? { resourceType: query.resourceType } : {}),
        ...(query.userId ? { actorUserId: query.userId } : {}),
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
        limit: query.limit
      });

      response.json({
        data: entries
      });
    }
  );

  return router;
}
