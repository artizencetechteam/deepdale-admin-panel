"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3CompatibleStorage = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../../config/env");
const errors_1 = require("../errors");
const ids_1 = require("../ids");
class S3CompatibleStorage {
    client;
    constructor() {
        if (!env_1.env.S3_BUCKET ||
            !env_1.env.S3_ENDPOINT ||
            !env_1.env.S3_ACCESS_KEY_ID ||
            !env_1.env.S3_SECRET_ACCESS_KEY) {
            throw new errors_1.AppError(500, "s3_not_configured", "S3 storage is not fully configured");
        }
        this.client = new client_s3_1.S3Client({
            region: env_1.env.S3_REGION,
            endpoint: env_1.env.S3_ENDPOINT,
            forcePathStyle: true,
            credentials: {
                accessKeyId: env_1.env.S3_ACCESS_KEY_ID,
                secretAccessKey: env_1.env.S3_SECRET_ACCESS_KEY
            }
        });
    }
    async put(input) {
        const extension = input.originalFilename.includes(".")
            ? input.originalFilename.slice(input.originalFilename.lastIndexOf("."))
            : "";
        const filename = `${(0, ids_1.newId)()}${extension}`;
        const storageKey = `${input.kind}/${filename}`;
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: env_1.env.S3_BUCKET,
            Key: storageKey,
            Body: input.buffer,
            ContentType: input.mimeType
        }));
        return {
            filename,
            publicUrl: `${env_1.env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storageKey}`,
            sizeBytes: input.buffer.byteLength,
            storageKey
        };
    }
    async remove(storageKey) {
        await this.client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.env.S3_BUCKET,
            Key: storageKey
        }));
    }
}
exports.S3CompatibleStorage = S3CompatibleStorage;
