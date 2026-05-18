import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SECTION_KEYS } from "../../constants/section-keys";
import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

const { listActivityLogMock } = vi.hoisted(() => ({
  listActivityLogMock: vi.fn()
}));

const prismaMock = {
  leadSubmission: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  sectionState: {
    findMany: vi.fn()
  },
  productCard: { count: vi.fn() },
  partner: { count: vi.fn() },
  voiceScenario: { count: vi.fn() },
  automationEngine: { count: vi.fn() },
  capabilityCard: { count: vi.fn() },
  industryROI: { count: vi.fn() },
  processStep: { count: vi.fn() },
  productFeature: { count: vi.fn() },
  callerProfile: { count: vi.fn() },
  testimonial: { count: vi.fn() },
  faqCategory: { count: vi.fn() },
  faqItem: { count: vi.fn() },
  integration: { count: vi.fn() },
  navigationItem: { count: vi.fn() },
  megaMenuItem: { count: vi.fn() },
  footerLinkGroup: { count: vi.fn() },
  mediaAsset: { count: vi.fn() },
  heroContent: { count: vi.fn() },
  siteSettings: { count: vi.fn() },
  sectionConfig: { count: vi.fn() },
  supportFormConfig: { count: vi.fn() },
  ratingSummary: { count: vi.fn() }
};

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("../../lib/activity-log", () => ({
  listActivityLog: listActivityLogMock
}));

let createDashboardRouter: typeof import("./dashboard.routes").createDashboardRouter;

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

  ({ createDashboardRouter } = await import("./dashboard.routes"));
});

beforeEach(() => {
  vi.clearAllMocks();
  listActivityLogMock.mockResolvedValue([
    {
      id: "log_1",
      actorUserId: "user_1",
      actorRole: "admin",
      actorName: "Ops Admin",
      actorEmail: "ops@deepdale.local",
      action: "update",
      resourceType: "hero",
      resourceId: "1",
      resourceLabel: "Scale with AI",
      summary: "Updated hero: Scale with AI",
      metadata: null,
      ipAddress: "127.0.0.1",
      createdAt: new Date("2026-03-01T11:00:00.000Z")
    }
  ]);
  prismaMock.leadSubmission.count
    .mockResolvedValueOnce(12)
    .mockResolvedValueOnce(3);
  prismaMock.sectionState.findMany.mockResolvedValue([
    { key: "PRODUCT_SHOWCASE_OVERVIEW", isVisible: true, sortOrder: 0 },
    { key: "HERO_SECTION", isVisible: true, sortOrder: 1 },
    { key: "PRODUCT_SHOWCASE_SECTION", isVisible: true, sortOrder: 2 },
    { key: "PARTNERSHIP_SECTION", isVisible: true, sortOrder: 3 },
    { key: "VOICE_AGENTS_SECTION", isVisible: true, sortOrder: 4 },
    { key: "AUTOMATION_ENGINES_SECTION", isVisible: true, sortOrder: 5 },
    { key: "MODEL_CREATION_GRID_SECTION", isVisible: true, sortOrder: 6 },
    { key: "ROI_SNAPSHOT_SECTION", isVisible: true, sortOrder: 7 },
    { key: "PROCESS_STEPS_SECTION", isVisible: true, sortOrder: 8 },
    { key: "POWERFUL_PRODUCTS_OVERVIEW_SECTION", isVisible: true, sortOrder: 9 },
    { key: "CALLER_SHOWCASE_SECTION", isVisible: true, sortOrder: 10 },
    { key: "TESTIMONIALS_SECTION", isVisible: true, sortOrder: 11 },
    { key: "FAQ_SECTION", isVisible: false, sortOrder: 12 },
    { key: "INTEGRATIONS_SECTION", isVisible: false, sortOrder: 13 },
    { key: "SUPPORT_LEAD_FORM_SECTION", isVisible: true, sortOrder: 14 },
    { key: "SITE_FOOTER_SECTION", isVisible: true, sortOrder: 15 },
    { key: "HEADER", isVisible: true, sortOrder: 16 },
    { key: "CHAT", isVisible: false, sortOrder: 17 }
  ]);
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

  for (const delegate of [
    prismaMock.productCard,
    prismaMock.partner,
    prismaMock.voiceScenario,
    prismaMock.automationEngine,
    prismaMock.capabilityCard,
    prismaMock.industryROI,
    prismaMock.processStep,
    prismaMock.productFeature,
    prismaMock.callerProfile,
    prismaMock.testimonial,
    prismaMock.faqCategory,
    prismaMock.faqItem,
    prismaMock.integration,
    prismaMock.navigationItem,
    prismaMock.megaMenuItem,
    prismaMock.footerLinkGroup,
    prismaMock.mediaAsset,
    prismaMock.heroContent,
    prismaMock.siteSettings,
    prismaMock.sectionConfig,
    prismaMock.supportFormConfig,
    prismaMock.ratingSummary
  ]) {
    delegate.count.mockResolvedValue(1);
  }
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
  app.use("/api/admin/dashboard", createDashboardRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("dashboard routes", () => {
  it("returns the overview payload for viewers", async () => {
    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/dashboard/overview");

    expect(response.status).toBe(200);
    expect(response.body.data.totalLeads).toBe(12);
    expect(response.body.data.newLeads24h).toBe(3);
    expect(response.body.data.totalSectionsActive).toBe(15);
    expect(response.body.data.hiddenSections).toBe(3);
    expect(response.body.data.contentItems).toBe(22);
    expect(response.body.data.draftItems).toBe(16);
    expect(response.body.data.recentLeads).toHaveLength(1);
    expect(response.body.data.recentActivity).toEqual([]);
    expect(response.body.data.sectionManagers).toHaveLength(20);
    expect(response.body.data.frontendEndpoints).toEqual([
      expect.objectContaining({
        key: "home",
        path: "/api/content/home",
        method: "GET"
      }),
      expect.objectContaining({
        key: "navigation",
        path: "/api/content/navigation",
        method: "GET"
      }),
      expect.objectContaining({
        key: "footer",
        path: "/api/content/footer",
        method: "GET"
      }),
      expect.objectContaining({
        key: "leads",
        path: "/api/content/leads",
        method: "POST"
      }),
      expect.objectContaining({
        key: "chat",
        path: "/api/content/chat",
        method: "POST"
      }),
      expect.objectContaining({
        key: "openapi",
        path: "/openapi.json",
        method: "GET"
      }),
      expect.objectContaining({
        key: "preview-session",
        path: "/api/admin/preview/session",
        method: "GET"
      })
    ]);
    expect(
      response.body.data.sectionManagers.map(
        (manager: { key: string }) => manager.key
      )
    ).toEqual([...SECTION_KEYS, "SECTION_CONFIG", "MEDIA_LIBRARY"]);
    expect(response.body.data.sectionManagers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "PRODUCT_SHOWCASE_OVERVIEW",
          href: "/admin/hero",
          visibility: "visible",
          area: "landing"
        }),
        expect.objectContaining({
          key: "FAQ_SECTION",
          href: "/admin/faqs",
          visibility: "hidden",
          area: "landing"
        }),
        expect.objectContaining({
          key: "HEADER",
          href: "/admin/navigation",
          visibility: "visible",
          area: "global"
        }),
        expect.objectContaining({
          key: "CHAT",
          href: "/admin/settings",
          visibility: "hidden",
          area: "global"
        }),
        expect.objectContaining({
          key: "MEDIA_LIBRARY",
          href: "/admin/media",
          visibility: "system",
          itemCount: 1,
          area: "global"
        })
      ])
    );
    expect(response.body.data.quickActions).toEqual([
      { label: "Edit Hero", href: "/admin/hero" },
      { label: "Manage Products", href: "/admin/products" },
      { label: "Manage FAQs", href: "/admin/faqs" },
      { label: "Review Leads", href: "/admin/leads" }
    ]);
    expect(listActivityLogMock).not.toHaveBeenCalled();
  });

  it("prioritizes quick actions for missing setup and content", async () => {
    prismaMock.heroContent.count.mockResolvedValue(0);
    prismaMock.siteSettings.count.mockResolvedValue(0);
    prismaMock.sectionConfig.count.mockResolvedValue(0);
    prismaMock.productCard.count.mockResolvedValue(0);
    prismaMock.voiceScenario.count.mockResolvedValue(0);

    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/dashboard/overview");

    expect(response.status).toBe(200);
    expect(response.body.data.quickActions).toEqual([
      { label: "Complete Hero", href: "/admin/hero" },
      { label: "Configure Site Settings", href: "/admin/settings" },
      { label: "Set Section Copy", href: "/admin/sections" },
      { label: "Add Products", href: "/admin/products" }
    ]);
  });

  it("includes recent activity for admin roles", async () => {
    const app = createTestApp("admin");
    const response = await request(app).get("/api/admin/dashboard/overview");

    expect(response.status).toBe(200);
    expect(response.body.data.recentActivity).toEqual([
      expect.objectContaining({
        id: "log_1",
        summary: "Updated hero: Scale with AI",
        resourceType: "hero"
      })
    ]);
    expect(listActivityLogMock).toHaveBeenCalledWith({ limit: 6 });
  });
});
