import { Prisma } from "@prisma/client";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

const prismaMock = {
  user: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    count: vi.fn()
  }
};

const hashPasswordMock = vi.fn();
const { recordActivityMock } = vi.hoisted(() => ({
  recordActivityMock: vi.fn()
}));

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("../../lib/passwords", () => ({
  hashPassword: hashPasswordMock
}));

vi.mock("../../lib/activity-log", async () => {
  return {
    recordActivity: recordActivityMock
  };
});

let createUsersRouter: typeof import("./users.routes").createUsersRouter;

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

  ({ createUsersRouter } = await import("./users.routes"));
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(2);
});

function createTestApp(role: "viewer" | "editor" | "admin" | "superadmin") {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((request, _response, next) => {
    request.auth = {
      sessionId: "session_1",
      userId: "user_1",
      role,
      csrfToken: "csrf-token"
    };
    next();
  });
  app.use("/api/admin/users", createUsersRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("users routes", () => {
  it("allows superadmins to list users", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        email: "admin@deepdale.local",
        name: "Admin",
        role: "superadmin",
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const app = createTestApp("superadmin");
    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: "asc"
      }
    });
  });

  it("blocks non-superadmins from user management", async () => {
    const app = createTestApp("admin");
    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("creates users with hashed passwords", async () => {
    hashPasswordMock.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockResolvedValue({
      id: "user_2",
      email: "editor@deepdale.local",
      name: "Editor",
      role: "editor",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("superadmin");
    const response = await request(app)
      .post("/api/admin/users")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        email: "editor@deepdale.local",
        name: "Editor",
        role: "editor",
        password: "EditorPass123!",
        isActive: true
      });

    expect(response.status).toBe(201);
    expect(hashPasswordMock).toHaveBeenCalledWith("EditorPass123!");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "editor@deepdale.local",
          name: "Editor",
          role: "editor",
          passwordHash: "hashed-password",
          isActive: true
        })
      })
    );
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        resourceType: "users",
        resourceLabel: "editor@deepdale.local"
      })
    );
  });

  it("resets passwords for existing users", async () => {
    hashPasswordMock.mockResolvedValue("reset-password-hash");
    prismaMock.user.update.mockResolvedValue({
      id: "user_2"
    });

    const app = createTestApp("superadmin");
    const response = await request(app)
      .post("/api/admin/users/user_2/set-password")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        password: "AnotherPass123!"
      });

    expect(response.status).toBe(204);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: {
        id: "user_2"
      },
      data: {
        passwordHash: "reset-password-hash"
      }
    });
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "set_password",
        resourceType: "users",
        resourceId: "user_2"
      })
    );
  });

  it("blocks removing your own active superadmin access", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      email: "admin@deepdale.local",
      name: "Admin",
      role: "superadmin",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("superadmin");
    const response = await request(app)
      .patch("/api/admin/users/user_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        role: "admin"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("self_lockout_forbidden");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("blocks removing the last active superadmin", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_2",
      email: "admin2@deepdale.local",
      name: "Admin 2",
      role: "superadmin",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.user.count.mockResolvedValue(1);

    const app = createTestApp("superadmin");
    const response = await request(app)
      .patch("/api/admin/users/user_2")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        isActive: false
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("last_superadmin_forbidden");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("allows updating a superadmin when another active superadmin remains", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_2",
      email: "admin2@deepdale.local",
      name: "Admin 2",
      role: "superadmin",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.user.update.mockResolvedValue({
      id: "user_2",
      email: "admin2@deepdale.local",
      name: "Admin 2",
      role: "admin",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("superadmin");
    const response = await request(app)
      .patch("/api/admin/users/user_2")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        role: "admin"
      });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("admin");
  });

  it("returns 409 when a duplicate user email is created", async () => {
    hashPasswordMock.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate email", {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: ["email"]
        }
      })
    );

    const app = createTestApp("superadmin");
    const response = await request(app)
      .post("/api/admin/users")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        email: "editor@deepdale.local",
        name: "Editor",
        role: "editor",
        password: "EditorPass123!",
        isActive: true
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("unique_constraint_violation");
  });
});
