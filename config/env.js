"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    APP_BASE_URL: zod_1.z.string().url().default("http://localhost:4000"),
    CORS_ORIGINS: zod_1.z.string().default("http://localhost:5173"),
    SESSION_SECRET: zod_1.z.string().min(16),
    SESSION_COOKIE_NAME: zod_1.z.string().default("dd_admin_session"),
    CSRF_COOKIE_NAME: zod_1.z.string().default("dd_admin_csrf"),
    SESSION_TTL_HOURS: zod_1.z.coerce.number().int().positive().default(168),
    LOGIN_RATE_LIMIT_WINDOW_MINUTES: zod_1.z.coerce
        .number()
        .int()
        .positive()
        .default(15),
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: zod_1.z.coerce.number().int().positive().default(5),
    UPLOAD_DRIVER: zod_1.z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: zod_1.z.string().default("uploads"),
    ADMIN_SEED_EMAIL: zod_1.z.string().email().default("admin@deepdale.local"),
    ADMIN_SEED_PASSWORD: zod_1.z.string().min(8).default("ChangeMe123!"),
    OPENAI_API_KEY: zod_1.z.string().optional().default(""),
    OPENAI_BASE_URL: zod_1.z.string().optional().default(""),
    OPENAI_CHAT_MODEL_DEFAULT: zod_1.z.string().default("gpt-4o-mini"),
    TTS_PROVIDER: zod_1.z.enum(["disabled", "openai"]).default("disabled"),
    OPENAI_TTS_MODEL: zod_1.z.string().default("gpt-4o-mini-tts"),
    OPENAI_TTS_VOICE: zod_1.z.string().default("alloy"),
    S3_ENDPOINT: zod_1.z.string().optional().default(""),
    S3_REGION: zod_1.z.string().default("auto"),
    S3_BUCKET: zod_1.z.string().optional().default(""),
    S3_ACCESS_KEY_ID: zod_1.z.string().optional().default(""),
    S3_SECRET_ACCESS_KEY: zod_1.z.string().optional().default(""),
    S3_PUBLIC_BASE_URL: zod_1.z.string().optional().default("")
});
const parsed = envSchema.parse(process.env);
exports.env = {
    ...parsed,
    isProduction: parsed.NODE_ENV === "production",
    corsOrigins: parsed.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
};
