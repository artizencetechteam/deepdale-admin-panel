import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageAdapter, UploadInput, UploadResult } from "./storage";

import { env } from "../../config/env";
import { newId } from "../ids";

export class LocalDiskStorage implements StorageAdapter {
  async put(input: UploadInput): Promise<UploadResult> {
    const extension =
      path.extname(input.originalFilename) ||
      this.extensionForMime(input.mimeType);
    const filename = `${newId()}${extension}`;
    const storageKey = path.posix.join(input.kind, filename);
    const absolutePath = path.join(env.UPLOAD_DIR, input.kind, filename);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      filename,
      publicUrl: `${env.APP_BASE_URL}/uploads/${storageKey}`,
      sizeBytes: input.buffer.byteLength,
      storageKey
    };
  }

  async remove(storageKey: string): Promise<void> {
    const absolutePath = path.join(env.UPLOAD_DIR, ...storageKey.split("/"));
    await unlink(absolutePath).catch(() => undefined);
  }

  private extensionForMime(mimeType: string): string {
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/webp") return ".webp";
    if (mimeType === "image/svg+xml") return ".svg";
    if (mimeType === "audio/mpeg") return ".mp3";
    if (mimeType === "audio/wav") return ".wav";
    return "";
  }
}
