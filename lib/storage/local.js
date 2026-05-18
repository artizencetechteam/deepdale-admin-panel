"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDiskStorage = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("../../config/env");
const ids_1 = require("../ids");
class LocalDiskStorage {
    async put(input) {
        const extension = node_path_1.default.extname(input.originalFilename) ||
            this.extensionForMime(input.mimeType);
        const filename = `${(0, ids_1.newId)()}${extension}`;
        const storageKey = node_path_1.default.posix.join(input.kind, filename);
        const absolutePath = node_path_1.default.join(env_1.env.UPLOAD_DIR, input.kind, filename);
        await (0, promises_1.mkdir)(node_path_1.default.dirname(absolutePath), { recursive: true });
        await (0, promises_1.writeFile)(absolutePath, input.buffer);
        return {
            filename,
            publicUrl: `${env_1.env.APP_BASE_URL}/uploads/${storageKey}`,
            sizeBytes: input.buffer.byteLength,
            storageKey
        };
    }
    async remove(storageKey) {
        const absolutePath = node_path_1.default.join(env_1.env.UPLOAD_DIR, ...storageKey.split("/"));
        await (0, promises_1.unlink)(absolutePath).catch(() => undefined);
    }
    extensionForMime(mimeType) {
        if (mimeType === "image/png")
            return ".png";
        if (mimeType === "image/jpeg")
            return ".jpg";
        if (mimeType === "image/webp")
            return ".webp";
        if (mimeType === "image/svg+xml")
            return ".svg";
        if (mimeType === "audio/mpeg")
            return ".mp3";
        if (mimeType === "audio/wav")
            return ".wav";
        return "";
    }
}
exports.LocalDiskStorage = LocalDiskStorage;
