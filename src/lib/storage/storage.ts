import type { MediaKind } from "@prisma/client";

export type UploadInput = {
  buffer: Buffer;
  kind: MediaKind;
  mimeType: string;
  originalFilename: string;
};

export type UploadResult = {
  filename: string;
  publicUrl: string;
  sizeBytes: number;
  storageKey: string;
};

export interface StorageAdapter {
  put(input: UploadInput): Promise<UploadResult>;
  remove(storageKey: string): Promise<void>;
}
