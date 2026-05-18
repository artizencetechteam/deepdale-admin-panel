import { env } from "../../config/env";
import type { StorageAdapter } from "./storage";
import { LocalDiskStorage } from "./local";
import { S3CompatibleStorage } from "./s3";
import { CloudinaryStorage } from "./cloudinary";

let storageSingleton: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!storageSingleton) {
    if (env.UPLOAD_DRIVER === "cloudinary") {
      storageSingleton = new CloudinaryStorage();
    } else if (env.UPLOAD_DRIVER === "s3") {
      storageSingleton = new S3CompatibleStorage();
    } else {
      storageSingleton = new LocalDiskStorage();
    }
  }

  return storageSingleton;
}
