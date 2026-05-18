import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

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

  ({ createApp } = await import("./app"));
});

describe("app bootstrap", () => {
  it("returns a root api descriptor", async () => {
    const app = createApp();
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.data.service).toBe("deepdale-backend");
    expect(response.body.data.docsUrl).toBe("/openapi.json");
  });

  it("returns a health payload", async () => {
    const app = createApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.environment).toBe("test");
  });

  it("serves an openapi document", async () => {
    const app = createApp();
    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe("Deepdale Backend API");
    expect(response.body.paths["/api/admin/auth/csrf"]).toBeTruthy();
    expect(response.body.paths["/api/admin/products"]).toBeTruthy();
    expect(response.body.paths["/api/admin/media/{id}"]).toBeTruthy();
    expect(response.body.paths["/api/content/chat"]).toBeTruthy();
  });

  it("rejects disallowed cors origins explicitly", async () => {
    const app = createApp();
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://blocked.example.com");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("cors_origin_denied");
  });

  it("rejects malformed json bodies explicitly", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/content/leads")
      .set("Content-Type", "application/json")
      .send('{"fullName":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_json");
  });
});
