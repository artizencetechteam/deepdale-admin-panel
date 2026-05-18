import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";
import { listActivityLog } from "../../lib/activity-log";

vi.mock("../../lib/activity-log", () => ({
  ACTIVITY_ACTIONS: [
    "create",
    "update",
    "delete",
    "reorder",
    "toggle_visibility",
    "login",
    "logout",
    "set_password"
  ],
  listActivityLog: vi.fn()
}));

let createActivityLogRouter: typeof import("./activity.routes").createActivityLogRouter;

const listActivityLogMock = vi.mocked(listActivityLog);

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

  ({ createActivityLogRouter } = await import("./activity.routes"));
});

beforeEach(() => {
  vi.clearAllMocks();
  listActivityLogMock.mockResolvedValue([
    {
      id: "log_1",
      actorUserId: "user_1",
      actorRole: "superadmin",
      actorName: "Root Admin",
      actorEmail: "root@deepdale.local",
      action: "update",
      resourceType: "hero",
      resourceId: "1",
      resourceLabel: "Scale with AI",
      summary: "Updated hero: Scale with AI",
      metadata: null,
      ipAddress: "127.0.0.1",
      createdAt: new Date("2026-03-09T12:00:00.000Z")
    }
  ]);
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
  app.use("/api/admin/activity-log", createActivityLogRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("activity log routes", () => {
  it("lists audit entries for admins with filters", async () => {
    const app = createTestApp("admin");
    const response = await request(app).get("/api/admin/activity-log").query({
      action: "update",
      resourceType: "hero",
      dateFrom: "2026-03-01T00:00:00.000Z",
      limit: "25"
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(listActivityLogMock).toHaveBeenCalledWith({
      action: "update",
      resourceType: "hero",
      dateFrom: new Date("2026-03-01T00:00:00.000Z"),
      limit: 25
    });
  });

  it("blocks viewers from reading the audit log", async () => {
    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/activity-log");

    expect(response.status).toBe(403);
    expect(listActivityLogMock).not.toHaveBeenCalled();
  });
});
