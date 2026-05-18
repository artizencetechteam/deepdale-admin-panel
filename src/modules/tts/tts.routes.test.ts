import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

let createTtsRouter: typeof import("./tts.routes").createTtsRouter;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "4000";
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/deepdale";
  process.env.APP_BASE_URL = "http://localhost:4000";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.SESSION_SECRET = "1234567890abcdef1234567890abcdef";
  process.env.SESSION_COOKIE_NAME = "dd_admin_session";
  process.env.CSRF_COOKIE_NAME = "dd_admin_csrf";
  process.env.UPLOAD_DRIVER = "local";
  process.env.UPLOAD_DIR = "uploads";
  process.env.ADMIN_SEED_EMAIL = "admin@deepdale.local";
  process.env.ADMIN_SEED_PASSWORD = "ChangeMe123!";
  process.env.TTS_PROVIDER = "disabled";

  ({ createTtsRouter } = await import("./tts.routes"));
});

beforeEach(() => {
  process.env.TTS_PROVIDER = "disabled";
});

function createTestApp(role: "viewer" | "editor" | "admin" | "superadmin") {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = {
      sessionId: "session_1",
      userId: "user_1",
      role,
      csrfToken: "csrf-token"
    };
    next();
  });
  app.use("/api/admin/tts", createTtsRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("tts routes", () => {
  it("blocks viewers from preview generation", async () => {
    const app = createTestApp("viewer");
    const response = await request(app)
      .post("/api/admin/tts/preview/voice-scenario")
      .send({
        text: "Hello there"
      });

    expect(response.status).toBe(403);
  });

  it("returns 503 when tts is disabled", async () => {
    const app = createTestApp("editor");
    const response = await request(app)
      .post("/api/admin/tts/preview/caller")
      .send({
        text: "Hello there"
      });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("tts_not_configured");
  });
});
