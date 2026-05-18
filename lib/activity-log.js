"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVITY_ACTIONS = void 0;
exports.getRequestIp = getRequestIp;
exports.inferResourceLabel = inferResourceLabel;
exports.buildActivitySummary = buildActivitySummary;
exports.recordActivity = recordActivity;
exports.listActivityLog = listActivityLog;
const client_1 = require("@prisma/client");
const ids_1 = require("./ids");
const prisma_1 = require("./prisma");
exports.ACTIVITY_ACTIONS = [
    "create",
    "update",
    "delete",
    "reorder",
    "toggle_visibility",
    "login",
    "logout",
    "set_password"
];
function buildMetadataSql(metadata) {
    if (!metadata) {
        return client_1.Prisma.sql `NULL`;
    }
    return client_1.Prisma.sql `CAST(${JSON.stringify(metadata)} AS JSONB)`;
}
function getRequestIp(request) {
    if (!request) {
        return null;
    }
    const forwarded = request.header("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() ?? null;
    }
    return request.ip || null;
}
function inferResourceLabel(record) {
    if (!record || typeof record !== "object") {
        return null;
    }
    const candidateKeys = [
        "title",
        "name",
        "label",
        "heading",
        "headline",
        "author",
        "email",
        "shortLabel",
        "question",
        "siteName",
        "fullName"
    ];
    for (const key of candidateKeys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim().slice(0, 160);
        }
    }
    return null;
}
function buildActivitySummary(action, resourceType, resourceLabel) {
    const verbMap = {
        create: "Created",
        update: "Updated",
        delete: "Deleted",
        reorder: "Reordered",
        toggle_visibility: "Changed visibility for",
        login: "Signed in to",
        logout: "Signed out of",
        set_password: "Reset password for"
    };
    const readableResource = resourceType.replaceAll("-", " ");
    if (resourceLabel) {
        return `${verbMap[action]} ${readableResource}: ${resourceLabel}`;
    }
    return `${verbMap[action]} ${readableResource}`;
}
async function recordActivity({ request, actorUserId, actorRole, action, resourceType, resourceId, resourceLabel, summary, metadata, ipAddress }) {
    await prisma_1.prisma.$executeRaw(client_1.Prisma.sql `
      INSERT INTO "activity_logs" (
        "id",
        "actorUserId",
        "actorRole",
        "action",
        "resourceType",
        "resourceId",
        "resourceLabel",
        "summary",
        "metadata",
        "ipAddress"
      )
      VALUES (
        ${(0, ids_1.newId)()},
        ${actorUserId ?? request?.auth?.userId ?? null},
        ${actorRole ?? request?.auth?.role ?? null},
        ${action},
        ${resourceType},
        ${resourceId ?? null},
        ${resourceLabel ?? null},
        ${summary},
        ${buildMetadataSql(metadata)},
        ${ipAddress ?? getRequestIp(request)}
      )
    `);
}
async function listActivityLog({ action, resourceType, actorUserId, dateFrom, dateTo, limit = 50 }) {
    const filters = [];
    if (action) {
        filters.push(client_1.Prisma.sql `log."action" = ${action}`);
    }
    if (resourceType) {
        filters.push(client_1.Prisma.sql `log."resourceType" = ${resourceType}`);
    }
    if (actorUserId) {
        filters.push(client_1.Prisma.sql `log."actorUserId" = ${actorUserId}`);
    }
    if (dateFrom) {
        filters.push(client_1.Prisma.sql `log."createdAt" >= ${dateFrom}`);
    }
    if (dateTo) {
        filters.push(client_1.Prisma.sql `log."createdAt" <= ${dateTo}`);
    }
    const whereSql = filters.length > 0
        ? client_1.Prisma.sql `WHERE ${client_1.Prisma.join(filters, " AND ")}`
        : client_1.Prisma.sql ``;
    return prisma_1.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        log."id",
        log."actorUserId",
        log."actorRole",
        actor."name" AS "actorName",
        actor."email" AS "actorEmail",
        log."action",
        log."resourceType",
        log."resourceId",
        log."resourceLabel",
        log."summary",
        log."metadata",
        log."ipAddress",
        log."createdAt"
      FROM "activity_logs" AS log
      LEFT JOIN "users" AS actor ON actor."id" = log."actorUserId"
      ${whereSql}
      ORDER BY log."createdAt" DESC
      LIMIT ${limit}
    `);
}
