import { Prisma } from "@prisma/client";
import type { Request } from "express";

import { newId } from "./ids";
import { prisma } from "./prisma";

export const ACTIVITY_ACTIONS = [
  "create",
  "update",
  "delete",
  "reorder",
  "toggle_visibility",
  "login",
  "logout",
  "set_password"
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export type ActivityLogEntry = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  resourceLabel: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
};

type RecordActivityInput = {
  request?: Request;
  actorUserId?: string | null | undefined;
  actorRole?: string | null | undefined;
  action: ActivityAction;
  resourceType: string;
  resourceId?: string | null | undefined;
  resourceLabel?: string | null | undefined;
  summary: string;
  metadata?: Record<string, unknown> | null | undefined;
  ipAddress?: string | null | undefined;
};

type ActivityLogFilters = {
  action?: string | undefined;
  resourceType?: string | undefined;
  actorUserId?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  limit?: number | undefined;
};

function buildMetadataSql(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return Prisma.sql`NULL`;
  }

  const SENSITIVE_FIELDS = [
    "password",
    "passwordHash",
    "token",
    "csrfToken",
    "secret",
    "apiKey",
    "accessKey",
    "authorization"
  ];

  const sanitized = { ...metadata };

  for (const key of Object.keys(sanitized)) {
    if (
      SENSITIVE_FIELDS.some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      )
    ) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return Prisma.sql`CAST(${JSON.stringify(sanitized)} AS JSONB)`;
}

export function getRequestIp(request?: Request): string | null {
  if (!request) {
    return null;
  }

  const forwarded = request.header("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return request.ip || null;
}

export function inferResourceLabel(record: unknown): string | null {
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
    const value = (record as Record<string, unknown>)[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 160);
    }
  }

  return null;
}

export function buildActivitySummary(
  action: ActivityAction,
  resourceType: string,
  resourceLabel?: string | null
) {
  const verbMap: Record<ActivityAction, string> = {
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

export async function recordActivity({
  request,
  actorUserId,
  actorRole,
  action,
  resourceType,
  resourceId,
  resourceLabel,
  summary,
  metadata,
  ipAddress
}: RecordActivityInput) {
  await prisma.$executeRaw(
    Prisma.sql`
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
        ${newId()},
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
    `
  );
}

export async function listActivityLog({
  action,
  resourceType,
  actorUserId,
  dateFrom,
  dateTo,
  limit = 50
}: ActivityLogFilters) {
  const filters: Prisma.Sql[] = [];

  if (action) {
    filters.push(Prisma.sql`log."action" = ${action}`);
  }

  if (resourceType) {
    filters.push(Prisma.sql`log."resourceType" = ${resourceType}`);
  }

  if (actorUserId) {
    filters.push(Prisma.sql`log."actorUserId" = ${actorUserId}`);
  }

  if (dateFrom) {
    filters.push(Prisma.sql`log."createdAt" >= ${dateFrom}`);
  }

  if (dateTo) {
    filters.push(Prisma.sql`log."createdAt" <= ${dateTo}`);
  }

  const whereSql =
    filters.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
      : Prisma.sql``;

  return prisma.$queryRaw<ActivityLogEntry[]>(
    Prisma.sql`
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
    `
  );
}
