import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

const prismaMock = {
  mediaAsset: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    delete: vi.fn()
  }
};

const storageMock = {
  put: vi.fn(),
  remove: vi.fn()
};
const { recordActivityMock } = vi.hoisted(() => ({
  recordActivityMock: vi.fn()
}));

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("../../lib/storage", () => ({
  getStorageAdapter: () => storageMock
}));

vi.mock("../../lib/activity-log", async () => {
  return {
    recordActivity: recordActivityMock
  };
});

let createMediaRouter: typeof import("./media.routes").createMediaRouter;

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

  ({ createMediaRouter } = await import("./media.routes"));
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
  app.use("/api/admin/media", createMediaRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("media routes", () => {
  it("lists media assets for viewers", async () => {
    prismaMock.mediaAsset.findMany.mockResolvedValue([
      {
        id: "asset_1",
        kind: "image",
        filename: "hero.png",
        originalFilename: "hero.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        storageKey: "media/hero.png",
        publicUrl: "https://cdn.example.com/hero.png",
        createdAt: new Date()
      }
    ]);

    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/media");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("rejects unsupported media formats", async () => {
    const app = createTestApp("editor");
    const response = await request(app)
      .post("/api/admin/media/upload")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .attach("file", Buffer.from("plain text"), {
        filename: "notes.txt",
        contentType: "text/plain"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_media_type");
    expect(storageMock.put).not.toHaveBeenCalled();
  });

  it("sanitizes svg uploads before storing them", async () => {
    storageMock.put.mockResolvedValue({
      filename: "partner.svg",
      sizeBytes: 128,
      storageKey: "media/partner.svg",
      publicUrl: "https://cdn.example.com/partner.svg"
    });
    prismaMock.mediaAsset.create.mockResolvedValue({
      id: "asset_1",
      kind: "svg",
      filename: "partner.svg",
      originalFilename: "partner.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 128,
      storageKey: "media/partner.svg",
      publicUrl: "https://cdn.example.com/partner.svg",
      createdByUserId: "user_1",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("editor");
    const response = await request(app)
      .post("/api/admin/media/upload")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .attach(
        "file",
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" /></svg>'
        ),
        {
          filename: "partner.svg",
          contentType: "image/svg+xml"
        }
      );

    expect(response.status).toBe(201);
    expect(storageMock.put).toHaveBeenCalled();
    expect(
      storageMock.put.mock.calls[0]?.[0]?.buffer.toString("utf8")
    ).not.toContain("<script>");
    expect(
      storageMock.put.mock.calls[0]?.[0]?.buffer.toString("utf8")
    ).toContain("<svg");
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        resourceType: "media",
        resourceLabel: "partner.svg"
      })
    );
  });

  it("rejects mismatched media kinds for uploads", async () => {
    const app = createTestApp("editor");
    const response = await request(app)
      .post("/api/admin/media/upload")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .field("kind", "image")
      .attach(
        "file",
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        {
          filename: "partner.svg",
          contentType: "image/svg+xml"
        }
      );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("media_kind_mismatch");
    expect(storageMock.put).not.toHaveBeenCalled();
  });

  it("rejects svg uploads that sanitize to no safe svg markup", async () => {
    const app = createTestApp("editor");
    const response = await request(app)
      .post("/api/admin/media/upload")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .attach("file", Buffer.from("<script>alert(1)</script>"), {
        filename: "partner.svg",
        contentType: "image/svg+xml"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_svg_markup");
    expect(storageMock.put).not.toHaveBeenCalled();
  });

  it("deletes stored media and the backing asset", async () => {
    prismaMock.mediaAsset.findUniqueOrThrow.mockResolvedValue({
      id: "asset_1",
      storageKey: "media/hero.png"
    });
    prismaMock.mediaAsset.delete.mockResolvedValue({
      id: "asset_1"
    });

    const app = createTestApp("editor");
    const response = await request(app)
      .delete("/api/admin/media/asset_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token");

    expect(response.status).toBe(204);
    expect(storageMock.remove).toHaveBeenCalledWith("media/hero.png");
    expect(prismaMock.mediaAsset.delete).toHaveBeenCalledWith({
      where: {
        id: "asset_1"
      }
    });
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        resourceType: "media",
        resourceId: "asset_1"
      })
    );
  });
});
