import { Router, type Request } from "express";
import { PublicationStatus, type Role } from "@prisma/client";
import { z } from "zod";

import { requireCsrf } from "../../middleware/csrf";
import { requireRole } from "../../middleware/roles";
import { publicContentCache } from "../../lib/public-cache";
import { prisma } from "../../lib/prisma";
import { parseWithSchema } from "../../lib/validation";
import { newId } from "../../lib/ids";
import { reorderSchema } from "../../schemas/common";
import {
  buildActivitySummary,
  inferResourceLabel,
  recordActivity
} from "../../lib/activity-log";

type RecordMapper<TRecord> = (record: TRecord, request: Request) => unknown;
type DataBuilder<TInput> = (
  input: TInput,
  request: Request,
  mode: "create" | "update"
) => Record<string, unknown>;

type CollectionRouterOptions<TInput, TRecord> = {
  path: string;
  delegate: keyof typeof prisma;
  createSchema: z.ZodSchema<TInput>;
  updateSchema: z.ZodSchema<TInput>;
  include?: Record<string, unknown>;
  orderBy?:
    | Record<string, "asc" | "desc">
    | Array<Record<string, "asc" | "desc">>;
  readRoles: Role[];
  writeRoles: Role[];
  buildData?: DataBuilder<TInput>;
  mapRecord?: RecordMapper<TRecord>;
  mutateCache?: boolean;
  reorderField?: string;
  listWhere?: (request: Request) => Record<string, unknown> | undefined;
  auditResourceType?: string;
  supportsPublicationStatus?: boolean;
};

type SingletonRouterOptions<TInput, TRecord> = {
  path: string;
  delegate: keyof typeof prisma;
  updateSchema: z.ZodSchema<TInput>;
  readRoles: Role[];
  writeRoles: Role[];
  include?: Record<string, unknown>;
  buildData?: DataBuilder<TInput>;
  mapRecord?: RecordMapper<TRecord>;
  mutateCache?: boolean;
  auditResourceType?: string;
};

function asDelegate(delegate: keyof typeof prisma): any {
  return prisma[delegate];
}

function withAuditFields(request: Request): {
  createdByUserId?: string;
  updatedByUserId?: string;
} {
  return request.auth?.userId
    ? {
        createdByUserId: request.auth.userId,
        updatedByUserId: request.auth.userId
      }
    : {};
}

function withUpdatedAuditField(request: Request): { updatedByUserId?: string } {
  return request.auth?.userId
    ? {
        updatedByUserId: request.auth.userId
      }
    : {};
}

const publicationStatusUpdateSchema = z.object({
  publicationStatus: z.nativeEnum(PublicationStatus)
});

export function buildCollectionRouter<TInput, TRecord>(
  options: CollectionRouterOptions<TInput, TRecord>
): Router {
  const router = Router();
  const delegate = asDelegate(options.delegate);
  const mapRecord = options.mapRecord ?? ((record) => record);
  const orderBy = options.orderBy ?? ({ sortOrder: "asc" } as const);
  const auditResourceType = (options.auditResourceType ?? options.path).replace(
    /^\//,
    ""
  );
  const buildData =
    options.buildData ??
    ((input: TInput, request: Request, mode: "create" | "update") => ({
      ...(input as Record<string, unknown>),
      ...(mode === "create"
        ? withAuditFields(request)
        : withUpdatedAuditField(request))
    }));

  router.get(
    "/",
    requireRole(...options.readRoles),
    async (request, response) => {
      const publicationStatus =
        options.supportsPublicationStatus &&
        typeof request.query.publicationStatus === "string"
          ? parseWithSchema(
              z.nativeEnum(PublicationStatus),
              request.query.publicationStatus
            )
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
        data: records.map((record: TRecord) => mapRecord(record, request))
      });
    }
  );

  router.patch(
    "/reorder",
    requireRole(...options.writeRoles),
    requireCsrf,
    async (request, response) => {
      const payload = parseWithSchema(reorderSchema, request.body);
      const reorderField = options.reorderField ?? "sortOrder";

      await prisma.$transaction(
        payload.map((item) =>
          delegate.update({
            where: { id: item.id },
            data: {
              [reorderField]: item.sortOrder,
              ...withUpdatedAuditField(request)
            }
          })
        )
      );

      if (options.mutateCache !== false) {
        publicContentCache.invalidatePrefix("public:");
      }

      await recordActivity({
        request,
        action: "reorder",
        resourceType: auditResourceType,
        summary: buildActivitySummary("reorder", auditResourceType),
        metadata: {
          count: payload.length
        }
      });

      response.json({ success: true });
    }
  );

  router.get(
    "/:id",
    requireRole(...options.readRoles),
    async (request, response) => {
      const record = await delegate.findUniqueOrThrow({
        where: { id: request.params.id },
        include: options.include
      });

      response.json({ data: mapRecord(record, request) });
    }
  );

  router.post(
    "/",
    requireRole(...options.writeRoles),
    requireCsrf,
    async (request, response) => {
      const input = parseWithSchema(options.createSchema, request.body);
      const record = await delegate.create({
        data: {
          id: newId(),
          ...buildData(input, request, "create")
        },
        include: options.include
      });

      if (options.mutateCache !== false) {
        publicContentCache.invalidatePrefix("public:");
      }

      await recordActivity({
        request,
        action: "create",
        resourceType: auditResourceType,
        resourceId: record.id,
        resourceLabel: inferResourceLabel(record),
        summary: buildActivitySummary(
          "create",
          auditResourceType,
          inferResourceLabel(record)
        )
      });

      response.status(201).json({ data: mapRecord(record, request) });
    }
  );

  router.put(
    "/:id",
    requireRole(...options.writeRoles),
    requireCsrf,
    async (request, response) => {
      const input = parseWithSchema(options.updateSchema, request.body);
      const record = await delegate.update({
        where: { id: request.params.id },
        data: buildData(input, request, "update"),
        include: options.include
      });

      if (options.mutateCache !== false) {
        publicContentCache.invalidatePrefix("public:");
      }

      await recordActivity({
        request,
        action: "update",
        resourceType: auditResourceType,
        resourceId: String(request.params.id ?? ""),
        resourceLabel: inferResourceLabel(record),
        summary: buildActivitySummary(
          "update",
          auditResourceType,
          inferResourceLabel(record)
        )
      });

      response.json({ data: mapRecord(record, request) });
    }
  );

  if (options.supportsPublicationStatus) {
    router.patch(
      "/:id/publication-status",
      requireRole(...options.writeRoles),
      requireCsrf,
      async (request, response) => {
        const input = parseWithSchema(publicationStatusUpdateSchema, request.body);
        const record = await delegate.update({
          where: { id: request.params.id },
          data: {
            publicationStatus: input.publicationStatus,
            ...withUpdatedAuditField(request)
          },
          include: options.include
        });

        if (options.mutateCache !== false) {
          publicContentCache.invalidatePrefix("public:");
        }

        await recordActivity({
          request,
          action: "update",
          resourceType: auditResourceType,
          resourceId: String(request.params.id ?? ""),
          resourceLabel: inferResourceLabel(record),
          summary:
            input.publicationStatus === "published"
              ? `Published ${auditResourceType.replaceAll("-", " ")}: ${inferResourceLabel(record) ?? request.params.id}`
              : `Moved ${auditResourceType.replaceAll("-", " ")} to draft: ${inferResourceLabel(record) ?? request.params.id}`,
          metadata: {
            publicationStatus: input.publicationStatus
          }
        });

        response.json({ data: mapRecord(record, request) });
      }
    );
  }

  router.delete(
    "/:id",
    requireRole(...options.writeRoles),
    requireCsrf,
    async (request, response) => {
      const existing = await delegate.findUnique({
        where: { id: request.params.id }
      });

      await delegate.delete({
        where: { id: request.params.id }
      });

      if (options.mutateCache !== false) {
        publicContentCache.invalidatePrefix("public:");
      }

      await recordActivity({
        request,
        action: "delete",
        resourceType: auditResourceType,
        resourceId: String(request.params.id ?? ""),
        resourceLabel: inferResourceLabel(existing),
        summary: buildActivitySummary(
          "delete",
          auditResourceType,
          inferResourceLabel(existing)
        )
      });

      response.status(204).send();
    }
  );

  return router;
}

export function buildSingletonRouter<TInput, TRecord>(
  options: SingletonRouterOptions<TInput, TRecord>
): Router {
  const router = Router();
  const delegate = asDelegate(options.delegate);
  const mapRecord = options.mapRecord ?? ((record) => record);
  const auditResourceType = (options.auditResourceType ?? options.path).replace(
    /^\//,
    ""
  );
  const buildData =
    options.buildData ??
    ((input: TInput, request: Request, mode: "create" | "update") => ({
      ...(input as Record<string, unknown>),
      ...(mode === "create"
        ? withAuditFields(request)
        : withUpdatedAuditField(request))
    }));

  router.get(
    "/",
    requireRole(...options.readRoles),
    async (request, response) => {
      const record = await delegate.findUniqueOrThrow({
        where: { id: 1 },
        include: options.include
      });

      response.json({ data: mapRecord(record, request) });
    }
  );

  router.put(
    "/",
    requireRole(...options.writeRoles),
    requireCsrf,
    async (request, response) => {
      const existing = await delegate.findUnique({
        where: { id: 1 },
        include: options.include
      });
      const input = parseWithSchema(options.updateSchema, request.body);
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
        publicContentCache.invalidatePrefix("public:");
      }

      const action = existing ? "update" : "create";
      const resourceLabel = inferResourceLabel(record);

      await recordActivity({
        request,
        action,
        resourceType: auditResourceType,
        resourceId: "1",
        resourceLabel,
        summary: buildActivitySummary(action, auditResourceType, resourceLabel)
      });

      response.json({ data: mapRecord(record, request) });
    }
  );

  return router;
}
