"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivityLogRouter = createActivityLogRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const activity_log_1 = require("../../lib/activity-log");
const roles_1 = require("../../middleware/roles");
const validation_1 = require("../../lib/validation");
const activityLogQuerySchema = zod_1.z.object({
    action: zod_1.z.enum(activity_log_1.ACTIVITY_ACTIONS).optional(),
    resourceType: zod_1.z.string().trim().min(1).max(120).optional(),
    userId: zod_1.z.string().trim().min(1).max(120).optional(),
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50)
});
function createActivityLogRouter() {
    const router = (0, express_1.Router)();
    router.get("/", (0, roles_1.requireRole)("admin", "superadmin"), async (request, response) => {
        const query = (0, validation_1.parseWithSchema)(activityLogQuerySchema, request.query);
        const entries = await (0, activity_log_1.listActivityLog)({
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
    });
    return router;
}
