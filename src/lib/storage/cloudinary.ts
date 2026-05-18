import { v2 as cloudinary } from "cloudinary";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { env } from "../../config/env";
import { AppError } from "../errors";
import type { StorageAdapter, UploadInput, UploadResult } from "./storage";

export class CloudinaryStorage implements StorageAdapter {
  constructor() {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error(
        "Missing Cloudinary configuration. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required."
      );
    }

    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
  }

  async put(input: UploadInput): Promise<UploadResult> {
    const ext = path.extname(input.originalFilename);
    const uniqueId = randomBytes(16).toString("hex");
    const safeOriginalName = path.basename(input.originalFilename, ext).replace(/[^a-zA-Z0-9-]/g, "_");
    
    // Cloudinary standardizes extensions but we want to form a valid public_id
    const publicId = `${input.kind}s/${uniqueId}-${safeOriginalName}`;
    const base64Data = `data:${input.mimeType};base64,${input.buffer.toString("base64")}`;

    try {
      const result = await cloudinary.uploader.upload(base64Data, {
        public_id: publicId,
        resource_type: input.kind === "audio" ? "video" : "auto",
        folder: "deepdale",
      });

      return {
        filename: `${publicId}${ext}`,
        publicUrl: result.secure_url,
        sizeBytes: result.bytes,
        storageKey: result.public_id,
      };
    } catch (error: any) {
      throw new AppError(500, "cloudinary_upload_failed", `Cloudinary upload failed: ${error.message}`);
    }
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey);
    } catch (error: any) {
      console.error("[Storage] Failed to remove asset from Cloudinary:", error);
    }
  }
}
