import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const resolveSessionMock = vi.fn();

vi.mock("./lib/session", async () => {
  const actual =
    await vi.importActual<typeof import("./lib/session")>("./lib/session");

  return {
    ...actual,
    resolveSession: resolveSessionMock
  };
});

let createApp: typeof import("./app").createApp;

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

  resolveSessionMock.mockResolvedValue({
    sessionId: "session_1",
    userId: "user_1",
    role: "viewer",
    csrfToken: "csrf-token"
  });

  ({ createApp } = await import("./app"));
});

describe("admin app routes", () => {
  it("returns ui option metadata for authenticated admins", async () => {
    const app = createApp();
    const response = await request(app).get("/api/admin/meta/ui-options");

    expect(response.status).toBe(200);
    expect(response.body.data.gradientPresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: "ocean-blue"
        })
      ])
    );
    expect(response.body.data.iconNames).toContain("Bot");
  });
});
