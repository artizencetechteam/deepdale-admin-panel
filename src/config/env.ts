import "dotenv/config";

import { z } from "zod";
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  SESSION_SECRET: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().default("dd_admin_session"),
  CSRF_COOKIE_NAME: z.string().default("dd_admin_csrf"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  UPLOAD_DRIVER: z.enum(["local", "s3", "cloudinary"]).default("local"),
  UPLOAD_DIR: z.string().default("uploads"),
  ADMIN_SEED_EMAIL: z.string().email().default("admin@deepdale.local"),
  ADMIN_SEED_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_BASE_URL: z.string().optional().default(""),
  OPENAI_CHAT_MODEL_DEFAULT: z.string().default("gpt-4o-mini"),
  TTS_PROVIDER: z.enum(["disabled", "openai"]).default("disabled"),
  OPENAI_TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
  OPENAI_TTS_VOICE: z.string().default("alloy"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_PUBLIC_BASE_URL: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default("")
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === "production",
  corsOrigins: parsed.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};
