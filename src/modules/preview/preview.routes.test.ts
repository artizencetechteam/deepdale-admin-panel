import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

let createPreviewRouter: typeof import("./preview.routes").createPreviewRouter;

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

  ({ createPreviewRouter } = await import("./preview.routes"));
});

function createTestApp(role: "viewer" | "editor" | "admin" | "superadmin") {
  const app = express();
  app.use((request, _response, next) => {
    request.auth = {
      sessionId: "session_1",
      userId: "user_1",
      role,
      csrfToken: "csrf-token"
    };
    next();
  });
  app.use("/api/admin/preview", createPreviewRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("preview routes", () => {
  it("returns signed preview session metadata for authenticated admins", async () => {
    const app = createTestApp("editor");
    const response = await request(app).get("/api/admin/preview/session");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      token: expect.any(String),
      expiresAt: expect.any(String),
      requestedByUserId: "user_1",
      endpoints: [
        expect.objectContaining({
          key: "home",
          path: expect.stringContaining("/api/content/home?previewToken="),
          absoluteUrl: expect.stringContaining(
            "http://localhost:4000/api/content/home?previewToken="
          )
        }),
        expect.objectContaining({
          key: "navigation",
          path: expect.stringContaining("/api/content/navigation?previewToken=")
        }),
        expect.objectContaining({
          key: "footer",
          path: expect.stringContaining("/api/content/footer?previewToken=")
        })
      ]
    });
  });

  it("blocks preview sessions for unauthorized roles", async () => {
    const app = express();
    app.use("/api/admin/preview", createPreviewRouter());
    app.use(notFoundHandler);
    app.use(errorHandler);

    const response = await request(app).get("/api/admin/preview/session");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("forbidden");
  });
});
