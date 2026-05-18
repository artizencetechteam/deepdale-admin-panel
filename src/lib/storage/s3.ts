import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import type { StorageAdapter, UploadInput, UploadResult } from "./storage";

import { env } from "../../config/env";
import { AppError } from "../errors";
import { newId } from "../ids";

export class S3CompatibleStorage implements StorageAdapter {
  private readonly client: S3Client;

  constructor() {
    if (
      !env.S3_BUCKET ||
      !env.S3_ENDPOINT ||
      !env.S3_ACCESS_KEY_ID ||
      !env.S3_SECRET_ACCESS_KEY
    ) {
      throw new AppError(
        500,
        "s3_not_configured",
        "S3 storage is not fully configured"
      );
    }

    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      }
    });
  }

  async put(input: UploadInput): Promise<UploadResult> {
    const extension = input.originalFilename.includes(".")
      ? input.originalFilename.slice(input.originalFilename.lastIndexOf("."))
      : "";
    const filename = `${newId()}${extension}`;
    const storageKey = `${input.kind}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
        Body: input.buffer,
        ContentType: input.mimeType
      })
    );

    return {
      filename,
      publicUrl: `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storageKey}`,
      sizeBytes: input.buffer.byteLength,
      storageKey
    };
  }

  async remove(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey
      })
    );
  }
}
