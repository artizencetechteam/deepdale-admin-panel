"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCollectionRouter = buildCollectionRouter;
exports.buildSingletonRouter = buildSingletonRouter;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const csrf_1 = require("../../middleware/csrf");
const roles_1 = require("../../middleware/roles");
const public_cache_1 = require("../../lib/public-cache");
const prisma_1 = require("../../lib/prisma");
const validation_1 = require("../../lib/validation");
const ids_1 = require("../../lib/ids");
const common_1 = require("../../schemas/common");
const activity_log_1 = require("../../lib/activity-log");
function asDelegate(delegate) {
    return prisma_1.prisma[delegate];
}
function withAuditFields(request) {
    return request.auth?.userId
        ? {
            createdByUserId: request.auth.userId,
            updatedByUserId: request.auth.userId
        }
        : {};
}
function withUpdatedAuditField(request) {
    return request.auth?.userId
        ? {
            updatedByUserId: request.auth.userId
        }
        : {};
}
const publicationStatusUpdateSchema = zod_1.z.object({
    publicationStatus: zod_1.z.nativeEnum(client_1.PublicationStatus)
});
function buildCollectionRouter(options) {
    const router = (0, express_1.Router)();
    const delegate = asDelegate(options.delegate);
    const mapRecord = options.mapRecord ?? ((record) => record);
    const orderBy = options.orderBy ?? { sortOrder: "asc" };
    const auditResourceType = (options.auditResourceType ?? options.path).replace(/^\//, "");
    const buildData = options.buildData ??
        ((input, request, mode) => ({
            ...input,
            ...(mode === "create"
                ? withAuditFields(request)
                : withUpdatedAuditField(request))
        }));
    router.get("/", (0, roles_1.requireRole)(...options.readRoles), async (request, response) => {
        const publicationStatus = options.supportsPublicationStatus &&
            typeof request.query.publicationStatus === "string"
            ? (0, validation_1.parseWithSchema)(zod_1.z.nativeEnum(client_1.PublicationStatus), request.query.publicationStatus)
            : undefined;
        const listWhere = options.listWhere?.(request);
        const records = await delegate.findMany({
            where: {
                ...(listWhere ?? {}),
                ...(publicationStatus ? { publicationStatus } : {})
            },
            include: options.include,
            orderBy
        });
        response.json({
            data: records.map((record) => mapRecord(record, request))
        });
    });
    router.patch("/reorder", (0, roles_1.requireRole)(...options.writeRoles), csrf_1.requireCsrf, async (request, response) => {
        const payload = (0, validation_1.parseWithSchema)(common_1.reorderSchema, request.body);
        const reorderField = options.reorderField ?? "sortOrder";
        await prisma_1.prisma.$transaction(payload.map((item) => delegate.update({
            where: { id: item.id },
            data: {
                [reorderField]: item.sortOrder,
                ...withUpdatedAuditField(request)
            }
        })));
        if (options.mutateCache !== false) {
            public_cache_1.publicContentCache.invalidatePrefix("public:");
        }
        await (0, activity_log_1.recordActivity)({
            request,
            action: "reorder",
            resourceType: auditResourceType,
            summary: (0, activity_log_1.buildActivitySummary)("reorder", auditResourceType),
            metadata: {
                count: payload.length
            }
        });
        response.json({ success: true });
    });
    router.get("/:id", (0, roles_1.requireRole)(...options.readRoles), async (request, response) => {
        const record = await delegate.findUniqueOrThrow({
            where: { id: request.params.id },
            include: options.include
        });
        response.json({ data: mapRecord(record, request) });
    });
    router.post("/", (0, roles_1.requireRole)(...options.writeRoles), csrf_1.requireCsrf, async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(options.createSchema, request.body);
        const record = await delegate.create({
            data: {
                id: (0, ids_1.newId)(),
                ...buildData(input, request, "create")
            },
            include: options.include
        });
        if (options.mutateCache !== false) {
            public_cache_1.publicContentCache.invalidatePrefix("public:");
        }
        await (0, activity_log_1.recordActivity)({
            request,
            action: "create",
            resourceType: auditResourceType,
            resourceId: record.id,
            resourceLabel: (0, activity_log_1.inferResourceLabel)(record),
            summary: (0, activity_log_1.buildActivitySummary)("create", auditResourceType, (0, activity_log_1.inferResourceLabel)(record))
        });
        response.status(201).json({ data: mapRecord(record, request) });
    });
    router.put("/:id", (0, roles_1.requireRole)(...options.writeRoles), csrf_1.requireCsrf, async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(options.updateSchema, request.body);
        const record = await delegate.update({
            where: { id: request.params.id },
            data: buildData(input, request, "update"),
            include: options.include
        });
        if (options.mutateCache !== false) {
            public_cache_1.publicContentCache.invalidatePrefix("public:");
        }
        await (0, activity_log_1.recordActivity)({
            request,
            action: "update",
            resourceType: auditResourceType,
            resourceId: String(request.params.id ?? ""),
            resourceLabel: (0, activity_log_1.inferResourceLabel)(record),
            summary: (0, activity_log_1.buildActivitySummary)("update", auditResourceType, (0, activity_log_1.inferResourceLabel)(record))
        });
        response.json({ data: mapRecord(record, request) });
    });
    if (options.supportsPublicationStatus) {
        router.patch("/:id/publication-status", (0, roles_1.requireRole)(...options.writeRoles), csrf_1.requireCsrf, async (request, response) => {
            const input = (0, validation_1.parseWithSchema)(publicationStatusUpdateSchema, request.body);
            const record = await delegate.update({
                where: { id: request.params.id },
                data: {
                    publicationStatus: input.publicationStatus,
                    ...withUpdatedAuditField(request)
                },
                include: options.include
            });
            if (options.mutateCache !== false) {
                public_cache_1.publicContentCache.invalidatePrefix("public:");
            }
            await (0, activity_log_1.recordActivity)({
                request,
                action: "update",
                resourceType: auditResourceType,
                resourceId: String(request.params.id ?? ""),
                resourceLabel: (0, activity_log_1.inferResourceLabel)(record),
                summary: input.publicationStatus === "published"
                    ? `Published ${auditResourceType.replaceAll("-", " ")}: ${(0, activity_log_1.inferResourceLabel)(record) ?? request.params.id}`
                    : `Moved ${auditResourceType.replaceAll("-", " ")} to draft: ${(0, activity_log_1.inferResourceLabel)(record) ?? request.params.id}`,
                metadata: {
                    publicationStatus: input.publicationStatus
                }
            });
            response.json({ data: mapRecord(record, request) });
        });
    }
    router.delete("/:id", (0, roles_1.requireRole)(...options.writeRoles), csrf_1.requireCsrf, async (request, response) => {
        const existing = await delegate.findUnique({
            where: { id: request.params.id }
        });
        await delegate.delete({
            where: { id: request.params.id }
        });
        if (options.mutateCache !== false) {
            public_cache_1.publicContentCache.invalidatePrefix("public:");
        }
        await (0, activity_log_1.recordActivity)({
            request,
            action: "delete",
            resourceType: auditResourceType,
            resourceId: String(request.params.id ?? ""),
            resourceLabel: (0, activity_log_1.inferResourceLabel)(existing),
            summary: (0, activity_log_1.buildActivitySummary)("delete", auditResourceType, (0, activity_log_1.inferResourceLabel)(existing))
        });
        response.status(204).send();
    });
    return router;
}
function buildSingletonRouter(options) {
    const router = (0, express_1.Router)();
    const delegate = asDelegate(options.delegate);
    const mapRecord = options.mapRecord ?? ((record) => record);
    const auditResourceType = (options.auditResourceType ?? options.path).replace(/^\//, "");
    const buildData = options.buildData ??
        ((input, request, mode) => ({
            ...input,
            ...(mode === "create"
                ? withAuditFields(request)
                : withUpdatedAuditField(request))
        }));
    router.get("/", (0, roles_1.requireRole)(...options.readRoles), async (request, response) => {
        const record = await delegate.findUniqueOrThrow({
            where: { id: 1 },
            include: options.include
        });
        response.json({ data: mapRecord(record, request) });
    });
    router.put("/", (0, roles_1.requireRole)(...options.writeRoles), csrf_1.requireCsrf, async (request, response) => {
        const existing = await delegate.findUnique({
            where: { id: 1 },
            include: options.include
        });
        const input = (0, validation_1.parseWithSchema)(options.updateSchema, request.body);
        const record = await delegate.upsert({
            where: { id: 1 },
            update: buildData(input, request, "update"),
            create: {
                id: 1,
                ...buildData(input, request, "create")
            },
            include: options.include
        });
        if (options.mutateCache !== false) {
            public_cache_1.publicContentCache.invalidatePrefix("public:");
        }
        const action = existing ? "update" : "create";
        const resourceLabel = (0, activity_log_1.inferResourceLabel)(record);
        await (0, activity_log_1.recordActivity)({
            request,
            action,
            resourceType: auditResourceType,
            resourceId: "1",
            resourceLabel,
            summary: (0, activity_log_1.buildActivitySummary)(action, auditResourceType, resourceLabel)
        });
        response.json({ data: mapRecord(record, request) });
    });
    return router;
}
