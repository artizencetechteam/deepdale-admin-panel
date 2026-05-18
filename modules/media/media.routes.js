"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMediaRouter = createMediaRouter;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const roles_1 = require("../../middleware/roles");
const csrf_1 = require("../../middleware/csrf");
const errors_1 = require("../../lib/errors");
const validation_1 = require("../../lib/validation");
const storage_1 = require("../../lib/storage");
const prisma_1 = require("../../lib/prisma");
const ids_1 = require("../../lib/ids");
const sanitize_1 = require("../../lib/sanitize");
const object_1 = require("../../lib/object");
const activity_log_1 = require("../../lib/activity-log");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});
const uploadSchema = zod_1.z.object({
    kind: zod_1.z.nativeEnum(client_1.MediaKind).optional()
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
function inferMediaKind(mimeType) {
    if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") {
        return client_1.MediaKind.image;
    }
    if (mimeType === "image/svg+xml") {
        return client_1.MediaKind.svg;
    }
    if (mimeType.startsWith("audio/")) {
        return client_1.MediaKind.audio;
    }
    return client_1.MediaKind.document;
}
function validateUpload(file, kind) {
    if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
        throw new errors_1.AppError(400, "invalid_media_type", "Unsupported media format");
    }
    const maxBytes = kind === client_1.MediaKind.audio ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
        throw new errors_1.AppError(400, "file_too_large", "Uploaded file exceeds the size limit");
    }
}
function createMediaRouter() {
    const router = (0, express_1.Router)();
    router.get("/", (0, roles_1.requireRole)("viewer", "editor", "admin", "superadmin"), async (_request, response) => {
        const assets = await prisma_1.prisma.mediaAsset.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });
        response.json({ data: assets });
    });
    router.post("/upload", (0, roles_1.requireRole)("editor", "admin", "superadmin"), csrf_1.requireCsrf, upload.single("file"), async (request, response) => {
        if (!request.file) {
            throw new errors_1.AppError(400, "file_missing", "A file upload is required");
        }
        const input = (0, validation_1.parseWithSchema)(uploadSchema, request.body);
        const inferredKind = inferMediaKind(request.file.mimetype);
        if (input.kind && input.kind !== inferredKind) {
            throw new errors_1.AppError(400, "media_kind_mismatch", "Uploaded file kind does not match its MIME type");
        }
        const kind = inferredKind;
        validateUpload(request.file, kind);
        const preparedBuffer = kind === client_1.MediaKind.svg
            ? Buffer.from((0, sanitize_1.sanitizeRequiredSvgMarkup)(request.file.buffer.toString("utf8")), "utf8")
            : request.file.buffer;
        const storage = (0, storage_1.getStorageAdapter)();
        const stored = await storage.put({
            buffer: preparedBuffer,
            kind,
            mimeType: request.file.mimetype,
            originalFilename: request.file.originalname
        });
        const asset = await prisma_1.prisma.mediaAsset.create({
            data: {
                id: (0, ids_1.newId)(),
                kind,
                filename: stored.filename,
                originalFilename: request.file.originalname,
                mimeType: request.file.mimetype,
                sizeBytes: stored.sizeBytes,
                storageKey: stored.storageKey,
                publicUrl: stored.publicUrl,
                ...(0, object_1.compactObject)({
                    createdByUserId: request.auth?.userId ?? null
                })
            }
        });
        await (0, activity_log_1.recordActivity)({
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
    });
    router.delete("/:id", (0, roles_1.requireRole)("editor", "admin", "superadmin"), csrf_1.requireCsrf, async (request, response) => {
        const id = String(request.params.id ?? "");
        const asset = await prisma_1.prisma.mediaAsset.findUniqueOrThrow({
            where: {
                id
            }
        });
        await (0, storage_1.getStorageAdapter)().remove(asset.storageKey);
        await prisma_1.prisma.mediaAsset.delete({
            where: {
                id: asset.id
            }
        });
        await (0, activity_log_1.recordActivity)({
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
    });
    return router;
}
