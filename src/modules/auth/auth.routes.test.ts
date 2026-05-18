import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

const prismaMock = {
  loginAttempt: {
    count: vi.fn(),
    create: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn()
  }
};

const verifyPasswordMock = vi.fn();
const createSessionMock = vi.fn();
const destroySessionMock = vi.fn();
const { recordActivityMock } = vi.hoisted(() => ({
  recordActivityMock: vi.fn()
}));

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("../../lib/passwords", () => ({
  verifyPassword: verifyPasswordMock
}));

vi.mock("../../lib/session", () => ({
  createSession: createSessionMock,
  destroySession: destroySessionMock
}));

vi.mock("../../lib/activity-log", async () => {
  return {
    recordActivity: recordActivityMock
  };
});

let createAuthRouter: typeof import("./auth.routes").createAuthRouter;

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

  ({ createAuthRouter } = await import("./auth.routes"));
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.loginAttempt.count.mockResolvedValue(0);
});

function createTestApp() {
  return createAuthenticatedTestApp();
}

function createAuthenticatedTestApp(withAuth = false) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  if (withAuth) {
    app.use((request, _response, next) => {
      request.auth = {
        sessionId: "session_1",
        userId: "user_1",
        role: "superadmin",
        csrfToken: "csrf-token"
      };
      next();
    });
  }
  app.use("/api/admin/auth", createAuthRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("auth routes", () => {
  it("rejects login when credentials are invalid", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "admin@deepdale.local",
      name: "Admin",
      role: "superadmin",
      isActive: true,
      passwordHash: "hashed",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    verifyPasswordMock.mockResolvedValue(false);

    const app = createTestApp();
    const response = await request(app).post("/api/admin/auth/login").send({
      email: "admin@deepdale.local",
      password: "wrong-password"
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("invalid_credentials");
    expect(prismaMock.loginAttempt.create).toHaveBeenCalled();
  });

  it("rejects login when the rate limit has been exceeded", async () => {
    prismaMock.loginAttempt.count.mockResolvedValue(5);

    const app = createTestApp();
    const response = await request(app).post("/api/admin/auth/login").send({
      email: "admin@deepdale.local",
      password: "ChangeMe123!"
    });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("login_rate_limited");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("creates a session when login succeeds", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "admin@deepdale.local",
      name: "Admin",
      role: "superadmin",
      isActive: true,
      passwordHash: "hashed",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    verifyPasswordMock.mockResolvedValue(true);
    createSessionMock.mockResolvedValue("csrf-token");

    const app = createTestApp();
    const response = await request(app).post("/api/admin/auth/login").send({
      email: "admin@deepdale.local",
      password: "ChangeMe123!"
    });

    expect(response.status).toBe(200);
    expect(response.body.data.csrfToken).toBe("csrf-token");
    expect(response.body.data.user.email).toBe("admin@deepdale.local");
    expect(response.body.data.user.lastLoginAt).toBeTruthy();
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(createSessionMock).toHaveBeenCalled();
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "login",
        resourceType: "auth-session",
        resourceLabel: "admin@deepdale.local"
      })
    );
  });

  it("returns the current admin user for authenticated requests", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      email: "admin@deepdale.local",
      name: "Admin",
      role: "superadmin",
      isActive: true,
      lastLoginAt: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createAuthenticatedTestApp(true);
    const response = await request(app).get("/api/admin/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe("user_1");
    expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: {
        id: "user_1"
      }
    });
  });

  it("returns the csrf token for authenticated requests", async () => {
    const app = createAuthenticatedTestApp(true);
    const response = await request(app).get("/api/admin/auth/csrf");

    expect(response.status).toBe(200);
    expect(response.body.data.csrfToken).toBe("csrf-token");
  });

  it("destroys the session on logout", async () => {
    const app = createAuthenticatedTestApp(true);
    const response = await request(app)
      .post("/api/admin/auth/logout")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", [
        "dd_admin_csrf=csrf-token",
        "dd_admin_session=session-token"
      ]);

    expect(response.status).toBe(204);
    expect(destroySessionMock).toHaveBeenCalledWith(
      expect.any(Object),
      "session-token"
    );
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "logout",
        resourceType: "auth-session"
      })
    );
  });
});
