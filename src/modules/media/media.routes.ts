import { Router } from "express";
import multer from "multer";
import { MediaKind } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "../../middleware/roles";
import { requireCsrf } from "../../middleware/csrf";
import { AppError } from "../../lib/errors";
import { parseWithSchema } from "../../lib/validation";
import { getStorageAdapter } from "../../lib/storage";
import { prisma } from "../../lib/prisma";
import { newId } from "../../lib/ids";
import { sanitizeRequiredSvgMarkup } from "../../lib/sanitize";
import { compactObject } from "../../lib/object";
import { recordActivity } from "../../lib/activity-log";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const uploadSchema = z.object({
  kind: z.nativeEnum(MediaKind).optional()
});

const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav"
]);

function inferMediaKind(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") {
    return MediaKind.image;
  }

  if (mimeType === "image/svg+xml") {
    return MediaKind.svg;
  }

  if (mimeType.startsWith("audio/")) {
    return MediaKind.audio;
  }

  return MediaKind.document;
}

function validateUpload(file: Express.Multer.File, kind: MediaKind): void {
  if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
    throw new AppError(400, "invalid_media_type", "Unsupported media format");
  }

  const maxBytes =
    kind === MediaKind.audio ? 20 * 1024 * 1024 : 5 * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new AppError(
      400,
      "file_too_large",
      "Uploaded file exceeds the size limit"
    );
  }
}

export function createMediaRouter(): Router {
  const router = Router();

  router.get(
    "/",
    requireRole("viewer", "editor", "admin", "superadmin"),
    async (_request, response) => {
      const assets = await prisma.mediaAsset.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });

      response.json({ data: assets });
    }
  );

  router.post(
    "/upload",
    requireRole("editor", "admin", "superadmin"),
    requireCsrf,
    upload.single("file"),
    async (request, response) => {
      if (!request.file) {
        throw new AppError(400, "file_missing", "A file upload is required");
      }

      const input = parseWithSchema(uploadSchema, request.body);
      const inferredKind = inferMediaKind(request.file.mimetype);

      if (input.kind && input.kind !== inferredKind) {
        throw new AppError(
          400,
          "media_kind_mismatch",
          "Uploaded file kind does not match its MIME type"
        );
      }

      const kind = inferredKind;

      validateUpload(request.file, kind);

      const preparedBuffer =
        kind === MediaKind.svg
          ? Buffer.from(
              sanitizeRequiredSvgMarkup(request.file.buffer.toString("utf8")),
              "utf8"
            )
          : request.file.buffer;

      const storage = getStorageAdapter();
      const stored = await storage.put({
        buffer: preparedBuffer,
        kind,
        mimeType: request.file.mimetype,
        originalFilename: request.file.originalname
      });

      const asset = await prisma.mediaAsset.create({
        data: {
          id: newId(),
          kind,
          filename: stored.filename,
          originalFilename: request.file.originalname,
          mimeType: request.file.mimetype,
          sizeBytes: stored.sizeBytes,
          storageKey: stored.storageKey,
          publicUrl: stored.publicUrl,
          ...compactObject({
            createdByUserId: request.auth?.userId ?? null
          })
        }
      });

      await recordActivity({
        request,
        action: "create",
        resourceType: "media",
        resourceId: asset.id,
        resourceLabel: asset.originalFilename,
        summary: `Uploaded media: ${asset.originalFilename}`,
        metadata: {
          kind: asset.kind,
          mimeType: asset.mimeType
        }
      });

      response.status(201).json({
        data: asset
      });
    }
  );

  router.delete(
    "/:id",
    requireRole("editor", "admin", "superadmin"),
    requireCsrf,
    async (request, response) => {
      const id = String(request.params.id ?? "");
      const asset = await prisma.mediaAsset.findUniqueOrThrow({
        where: {
          id
        }
      });

      await getStorageAdapter().remove(asset.storageKey);
      await prisma.mediaAsset.delete({
        where: {
          id: asset.id
        }
      });

      await recordActivity({
        request,
        action: "delete",
        resourceType: "media",
        resourceId: asset.id,
        resourceLabel: asset.originalFilename ?? asset.storageKey,
        summary: `Deleted media: ${asset.originalFilename ?? asset.storageKey}`,
        metadata: {
          kind: asset.kind ?? null
        }
      });

      response.status(204).send();
    }
  );

  router.post(
    "/delete-many",
    requireRole("admin", "superadmin"),
    requireCsrf,
    async (request, response) => {
      const payload = parseWithSchema(
        z.object({ ids: z.array(z.string().min(1)).min(1).max(50) }),
        request.body
      );

      const assets = await prisma.mediaAsset.findMany({
        where: { id: { in: payload.ids } }
      });

      if (assets.length === 0) {
        throw new AppError(404, "media_not_found", "No assets found to delete");
      }

      const storage = getStorageAdapter();

      await Promise.all(assets.map((a) => storage.remove(a.storageKey)));
      await prisma.mediaAsset.deleteMany({
        where: { id: { in: assets.map((a) => a.id) } }
      });

      await recordActivity({
        request,
        action: "delete",
        resourceType: "media",
        summary: `Bulk deleted ${assets.length} media assets`,
        metadata: {
          count: assets.length,
          ids: assets.map((a) => a.id)
        }
      });

      response.json({ success: true, count: assets.length });
    }
  );

  return router;
}
