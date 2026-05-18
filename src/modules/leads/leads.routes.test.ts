import { Prisma } from "@prisma/client";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

const prismaMock = {
  leadSubmission: {
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn()
  }
};
const { recordActivityMock } = vi.hoisted(() => ({
  recordActivityMock: vi.fn()
}));

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("../../lib/activity-log", async () => {
  return {
    recordActivity: recordActivityMock
  };
});

let createLeadsRouter: typeof import("./leads.routes").createLeadsRouter;

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

  ({ createLeadsRouter } = await import("./leads.routes"));
});

beforeEach(() => {
  vi.clearAllMocks();
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
  app.use("/api/admin/leads", createLeadsRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("leads routes", () => {
  it("lists leads for viewers with normalized source values", async () => {
    prismaMock.leadSubmission.findMany.mockResolvedValue([
      {
        id: "lead_1",
        fullName: "Taylor Doe",
        companyName: "Acme",
        email: "taylor@example.com",
        phone: null,
        source: "support_form",
        status: "new",
        notes: null,
        submittedAt: new Date("2026-03-01T10:00:00.000Z"),
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        updatedAt: new Date("2026-03-01T10:00:00.000Z")
      }
    ]);

    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/leads").query({
      status: "new",
      source: "support-form",
      search: "Acme"
    });

    expect(response.status).toBe(200);
    expect(response.body.data[0].source).toBe("support-form");
    expect(prismaMock.leadSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "new",
          source: "support_form"
        }),
        orderBy: {
          submittedAt: "desc"
        }
      })
    );
  });

  it("blocks editors from accessing the leads inbox", async () => {
    const app = createTestApp("editor");
    const response = await request(app).get("/api/admin/leads");

    expect(response.status).toBe(403);
    expect(prismaMock.leadSubmission.findMany).not.toHaveBeenCalled();
  });

  it("exports filtered leads as csv for admins", async () => {
    prismaMock.leadSubmission.findMany.mockResolvedValue([
      {
        id: "lead_1",
        fullName: "Taylor Doe",
        companyName: "Acme",
        email: "taylor@example.com",
        phone: "555-1234",
        source: "book_a_call",
        status: "qualified",
        notes: "Requested follow-up",
        submittedAt: new Date("2026-03-02T11:00:00.000Z")
      }
    ]);

    const app = createTestApp("admin");
    const response = await request(app)
      .get("/api/admin/leads/export.csv")
      .query({
        source: "book-a-call"
      });

    expect(response.status).toBe(200);
    expect(response.header["content-type"]).toContain("text/csv");
    expect(response.text).toContain('"book-a-call"');
    expect(response.text).toContain('"Taylor Doe"');
  });

  it("updates lead status and notes for admins", async () => {
    prismaMock.leadSubmission.update.mockResolvedValue({
      id: "lead_1",
      fullName: "Taylor Doe",
      companyName: "Acme",
      email: "taylor@example.com",
      phone: null,
      source: "support_form",
      status: "qualified",
      notes: "Requested pricing details",
      submittedAt: new Date("2026-03-01T10:00:00.000Z"),
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      updatedAt: new Date("2026-03-03T10:00:00.000Z")
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .patch("/api/admin/leads/lead_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        status: "qualified",
        notes: "Requested pricing details"
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("qualified");
    expect(prismaMock.leadSubmission.update).toHaveBeenCalledWith({
      where: {
        id: "lead_1"
      },
      data: {
        status: "qualified",
        notes: "Requested pricing details"
      }
    });
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        resourceType: "leads",
        resourceId: "lead_1"
      })
    );
  });

  it("returns 404 when a lead does not exist", async () => {
    prismaMock.leadSubmission.findUniqueOrThrow.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Lead not found", {
        code: "P2025",
        clientVersion: "test",
        meta: {
          modelName: "LeadSubmission"
        }
      })
    );

    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/leads/missing_lead");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("resource_not_found");
  });
});
