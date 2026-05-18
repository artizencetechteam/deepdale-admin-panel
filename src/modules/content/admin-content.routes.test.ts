import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";
import { publicContentCache } from "../../lib/public-cache";

const prismaMock = {
  $transaction: vi.fn(),
  siteSettings: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    upsert: vi.fn()
  },
  heroContent: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  productCard: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  partner: {
    create: vi.fn(),
    update: vi.fn()
  },
  industryROI: {
    update: vi.fn()
  },
  testimonial: {
    update: vi.fn()
  },
  integration: {
    update: vi.fn()
  },
  navigationItem: {
    update: vi.fn()
  },
  megaMenuItem: {
    update: vi.fn()
  },
  supportFormConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  sectionState: {
    update: vi.fn(),
    findMany: vi.fn()
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
    buildActivitySummary: (action: string, resourceType: string, label?: string | null) =>
      [action, resourceType, label].filter(Boolean).join(": "),
    inferResourceLabel: () => null,
    recordActivity: recordActivityMock
  };
});

let createAdminContentRouter: typeof import("./admin-content.routes").createAdminContentRouter;

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

  ({ createAdminContentRouter } = await import("./admin-content.routes"));
});

beforeEach(() => {
  vi.clearAllMocks();
  publicContentCache.clear();
  prismaMock.siteSettings.findUnique.mockResolvedValue(null);
  prismaMock.heroContent.findUnique.mockResolvedValue(null);
  prismaMock.supportFormConfig.findUnique.mockResolvedValue(null);
  prismaMock.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
    Promise.all(operations)
  );
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
  app.use("/api/admin", createAdminContentRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("admin content routes", () => {
  it("returns restricted site settings for viewers", async () => {
    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      siteName: "Deepdale",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@example.com",
      copyrightText: "Copyright",
      chatSystemPrompt: "private prompt",
      chatModel: "gpt-4o-mini",
      socialFacebook: "https://facebook.com/deepdale",
      socialLinkedin: null,
      socialYoutube: null,
      socialTwitter: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/site-settings");

    expect(response.status).toBe(200);
    expect(response.body.data.siteName).toBe("Deepdale");
    expect(response.body.data).not.toHaveProperty("chatSystemPrompt");
    expect(response.body.data).not.toHaveProperty("chatModel");
  });

  it("returns full site settings for admins", async () => {
    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      siteName: "Deepdale",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@example.com",
      copyrightText: "Copyright",
      chatSystemPrompt: "private prompt",
      chatModel: "gpt-4o-mini",
      socialFacebook: "https://facebook.com/deepdale",
      socialLinkedin: null,
      socialYoutube: null,
      socialTwitter: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app).get("/api/admin/site-settings");

    expect(response.status).toBe(200);
    expect(response.body.data.chatSystemPrompt).toBe("private prompt");
    expect(response.body.data.chatModel).toBe("gpt-4o-mini");
  });

  it("does not overwrite site settings creator metadata on update", async () => {
    prismaMock.siteSettings.findUnique.mockResolvedValue({
      id: 1
    });
    prismaMock.siteSettings.upsert.mockResolvedValue({
      id: 1,
      siteName: "Deepdale",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@example.com",
      copyrightText: "Copyright",
      chatSystemPrompt: "private prompt",
      chatModel: "gpt-4o-mini",
      socialFacebook: "https://facebook.com/deepdale",
      socialLinkedin: null,
      socialYoutube: null,
      socialTwitter: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/site-settings")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        siteName: "Deepdale",
        logoUrl: "https://example.com/logo.png",
        contactEmail: "contact@example.com",
        copyrightText: "Copyright",
        chatSystemPrompt: "private prompt",
        chatModel: "gpt-4o-mini",
        socialLinks: {
          facebook: "https://facebook.com/deepdale",
          linkedin: "",
          youtube: "",
          twitter: ""
        }
      });

    expect(response.status).toBe(200);
    expect(prismaMock.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({
          createdByUserId: expect.anything()
        }),
        create: expect.objectContaining({
          createdByUserId: "user_1"
        })
      })
    );
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        resourceType: "site-settings"
      })
    );
  });

  it("persists cleared optional site settings links as null", async () => {
    prismaMock.siteSettings.upsert.mockResolvedValue({
      id: 1,
      siteName: "Deepdale",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@example.com",
      copyrightText: "Copyright",
      chatSystemPrompt: "private prompt",
      chatModel: "gpt-4o-mini",
      socialFacebook: null,
      socialLinkedin: null,
      socialYoutube: null,
      socialTwitter: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/site-settings")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        siteName: "Deepdale",
        logoUrl: "https://example.com/logo.png",
        contactEmail: "contact@example.com",
        copyrightText: "Copyright",
        chatSystemPrompt: "private prompt",
        chatModel: "gpt-4o-mini",
        socialLinks: {
          facebook: "",
          linkedin: "",
          youtube: "",
          twitter: ""
        }
      });

    expect(response.status).toBe(200);
    expect(prismaMock.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          socialFacebook: null,
          socialLinkedin: null,
          socialYoutube: null,
          socialTwitter: null
        })
      })
    );
  });

  it("does not overwrite hero creator metadata on update", async () => {
    prismaMock.heroContent.upsert.mockResolvedValue({
      id: 1,
      headline: "Scale with AI",
      subheadline: "Automate support and sales",
      ctaText: "Book a Call",
      ctaLink: "/book-a-call",
      heroHeading: "One dashboard for every customer touchpoint",
      heroBackgroundImage: "https://example.com/hero-bg.png",
      heroDashboardImage: "https://example.com/dashboard.png",
      heroTabs: [],
      promptTemplates: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/hero")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        headline: "Scale with AI",
        subheadline: "Automate support and sales",
        ctaText: "Book a Call",
        ctaLink: "/book-a-call",
        promptTemplates: ["Qualify a lead"],
        heroTabs: [{ label: "Chatzify" }, { label: "VoiceAgent" }],
        heroHeading: "One dashboard for every customer touchpoint",
        heroBackgroundImage: "https://example.com/hero-bg.png",
        heroDashboardImage: "https://example.com/dashboard.png"
      });

    expect(response.status).toBe(200);
    expect(prismaMock.heroContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          heroTabs: expect.objectContaining({
            deleteMany: {}
          }),
          promptTemplates: expect.objectContaining({
            deleteMany: {}
          })
        }),
        create: expect.objectContaining({
          createdByUserId: "user_1",
          heroTabs: expect.not.objectContaining({
            deleteMany: expect.anything()
          }),
          promptTemplates: expect.not.objectContaining({
            deleteMany: expect.anything()
          })
        })
      })
    );
    expect(prismaMock.heroContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({
          createdByUserId: expect.anything()
        })
      })
    );
  });

  it("allows viewers to read products", async () => {
    prismaMock.productCard.findMany.mockResolvedValue([
      {
        id: "product_1",
        brand: "Chatzify",
        image: "https://example.com/chatzify.png",
        title: "Chat product",
        description: "Description",
        gradientPreset: "ocean-blue",
        buttonGradientPreset: "gold-lift",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const app = createTestApp("viewer");
    const response = await request(app).get("/api/admin/products");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(prismaMock.productCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          sortOrder: "asc"
        }
      })
    );
  });

  it("blocks viewers from creating products", async () => {
    const app = createTestApp("viewer");
    const response = await request(app).post("/api/admin/products").send({
      brand: "Chatzify",
      image: "https://example.com/chatzify.png",
      title: "Chat product",
      description: "Description",
      gradientPreset: "ocean-blue",
      buttonGradientPreset: "gold-lift",
      sortOrder: 0
    });

    expect(response.status).toBe(403);
    expect(prismaMock.productCard.create).not.toHaveBeenCalled();
  });

  it("requires csrf for admin writes", async () => {
    const app = createTestApp("admin");
    const response = await request(app).post("/api/admin/products").send({
      brand: "Chatzify",
      image: "https://example.com/chatzify.png",
      title: "Chat product",
      description: "Description",
      gradientPreset: "ocean-blue",
      buttonGradientPreset: "gold-lift",
      sortOrder: 0
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("csrf_missing");
  });

  it("validates product gradient presets before persistence", async () => {
    const app = createTestApp("admin");
    const response = await request(app)
      .post("/api/admin/products")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        brand: "Chatzify",
        image: "https://example.com/chatzify.png",
        title: "Chat product",
        description: "Description",
        gradientPreset: "invalid-token",
        buttonGradientPreset: "gold-lift",
        sortOrder: 0
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
    expect(prismaMock.productCard.create).not.toHaveBeenCalled();
  });

  it("updates section visibility for admins", async () => {
    prismaMock.sectionState.update.mockResolvedValue({
      key: "HERO_SECTION",
      isVisible: false,
      sortOrder: 1,
      updatedByUserId: "user_1",
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .patch("/api/admin/section-states/HERO_SECTION")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        isVisible: false
      });

    expect(response.status).toBe(200);
    expect(response.body.data.isVisible).toBe(false);
    expect(prismaMock.sectionState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "HERO_SECTION" }
      })
    );
  });

  it("reorders section states in a single transaction for admins", async () => {
    prismaMock.sectionState.update.mockResolvedValue({
      key: "HERO_SECTION",
      isVisible: true,
      sortOrder: 0,
      updatedByUserId: "user_1",
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .patch("/api/admin/section-states/reorder")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send([
        { key: "HERO_SECTION", sortOrder: 0 },
        { key: "PRODUCT_SHOWCASE_SECTION", sortOrder: 1 }
      ]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.sectionState.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { key: "HERO_SECTION" },
        data: expect.objectContaining({
          sortOrder: 0,
          updatedByUserId: "user_1"
        })
      })
    );
    expect(prismaMock.sectionState.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { key: "PRODUCT_SHOWCASE_SECTION" },
        data: expect.objectContaining({
          sortOrder: 1,
          updatedByUserId: "user_1"
        })
      })
    );
  });

  it("invalidates public cache after successful product writes", async () => {
    publicContentCache.set("public:home", {
      stale: true
    });
    prismaMock.productCard.create.mockResolvedValue({
      id: "product_1",
      brand: "Chatzify",
      image: "https://example.com/chatzify.png",
      title: "Chat product",
      description: "Description",
      gradientPreset: "ocean-blue",
      buttonGradientPreset: "gold-lift",
      sortOrder: 0,
      createdByUserId: "user_1",
      updatedByUserId: "user_1",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .post("/api/admin/products")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        brand: "Chatzify",
        image: "https://example.com/chatzify.png",
        title: "Chat product",
        description: "Description",
        gradientPreset: "ocean-blue",
        buttonGradientPreset: "gold-lift",
        sortOrder: 0
      });

    expect(response.status).toBe(201);
    expect(publicContentCache.get("public:home")).toBeUndefined();
  });

  it("updates product publication status for editors", async () => {
    publicContentCache.set("public:home", { stale: true });
    prismaMock.productCard.update.mockResolvedValue({
      id: "product_1",
      brand: "Chatzify",
      image: "https://example.com/chatzify.png",
      title: "Chat product",
      description: "Description",
      gradientPreset: "ocean-blue",
      buttonGradientPreset: "gold-lift",
      sortOrder: 0,
      publicationStatus: "draft",
      updatedByUserId: "user_1",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("editor");
    const response = await request(app)
      .patch("/api/admin/products/product_1/publication-status")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        publicationStatus: "draft"
      });

    expect(response.status).toBe(200);
    expect(response.body.data.publicationStatus).toBe("draft");
    expect(prismaMock.productCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product_1" },
        data: expect.objectContaining({
          publicationStatus: "draft",
          updatedByUserId: "user_1"
        })
      })
    );
    expect(publicContentCache.get("public:home")).toBeUndefined();
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        resourceType: "products",
        metadata: {
          publicationStatus: "draft"
        }
      })
    );
  });

  it("persists partner logos as URLs", async () => {
    prismaMock.partner.create.mockResolvedValue({
      id: "partner_1",
      name: "Acme",
      logoUrl: "https://example.com/logo.png",
      sortOrder: 0,
      isActive: true,
      createdByUserId: "user_1",
      updatedByUserId: "user_1",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .post("/api/admin/partners")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        name: "Acme",
        logoUrl: "https://example.com/logo.png",
        sortOrder: 0,
        isActive: true
      });

    expect(response.status).toBe(201);
    expect(prismaMock.partner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Acme",
          isActive: true,
          logoUrl: "https://example.com/logo.png"
        })
      })
    );
  });

  it("persists cleared optional ROI audio fields as null", async () => {
    prismaMock.industryROI.update.mockResolvedValue({
      id: "roi_1",
      label: "Healthcare",
      image: "https://example.com/roi.png",
      cvr: "2.4x",
      secondaryMetric: "18%",
      audioLabel: "Preview",
      audioDuration: "00:18",
      audioFile: null,
      sortOrder: 0,
      useCases: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/roi-industries/roi_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        label: "Healthcare",
        image: "https://example.com/roi.png",
        useCases: ["Scheduling"],
        cvr: "2.4x",
        secondaryMetric: "18%",
        audioLabel: "Preview",
        audioDuration: "00:18",
        audioFile: "",
        sortOrder: 0
      });

    expect(response.status).toBe(200);
    expect(prismaMock.industryROI.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audioFile: null
        })
      })
    );
  });

  it("persists cleared testimonial optional fields as null", async () => {
    prismaMock.testimonial.update.mockResolvedValue({
      id: "testimonial_1",
      quote: "Great work",
      author: "Jane Doe",
      title: "CEO",
      avatar: null,
      rating: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/testimonials/testimonial_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        quote: "Great work",
        author: "Jane Doe",
        title: "CEO",
        avatar: "",
        rating: null,
        sortOrder: 0,
        isActive: true
      });

    expect(response.status).toBe(200);
    expect(prismaMock.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          avatar: null,
          rating: null
        })
      })
    );
  });

  it("persists cleared optional integration logo URLs as null", async () => {
    prismaMock.integration.update.mockResolvedValue({
      id: "integration_1",
      name: "HubSpot",
      shortLabel: "HS",
      color: "#0ea5e9",
      logoUrl: null,
      row: 1,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/integrations/integration_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        name: "HubSpot",
        shortLabel: "HS",
        color: "#0ea5e9",
        logoUrl: "",
        row: 1,
        sortOrder: 0,
        isActive: true
      });

    expect(response.status).toBe(200);
    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          logoUrl: null
        })
      })
    );
  });

  it("persists cleared optional navigation and mega menu links as null", async () => {
    prismaMock.navigationItem.update.mockResolvedValue({
      id: "nav_1",
      label: "Pricing",
      href: null,
      hasDropdown: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.megaMenuItem.update.mockResolvedValue({
      id: "mega_1",
      column: "platforms",
      title: "Chatzify",
      description: "AI support",
      iconName: "Bot",
      iconColor: "#0f766e",
      isNew: false,
      link: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const navigationResponse = await request(app)
      .put("/api/admin/navigation-items/nav_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        label: "Pricing",
        href: "",
        hasDropdown: false,
        sortOrder: 0
      });
    const megaMenuResponse = await request(app)
      .put("/api/admin/mega-menu-items/mega_1")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        column: "platforms",
        title: "Chatzify",
        description: "AI support",
        iconName: "Bot",
        iconColor: "#0f766e",
        isNew: false,
        link: "",
        sortOrder: 0
      });

    expect(navigationResponse.status).toBe(200);
    expect(megaMenuResponse.status).toBe(200);
    expect(prismaMock.navigationItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          href: null
        })
      })
    );
    expect(prismaMock.megaMenuItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          link: null
        })
      })
    );
  });

  it("rejects partner svg markup when no safe svg remains after sanitization", async () => {
    const app = createTestApp("admin");
    const response = await request(app)
      .post("/api/admin/partners")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        name: "Acme",
        logoSvg: "<script>alert(1)</script>",
        sortOrder: 0,
        isActive: true
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_svg_markup");
    expect(prismaMock.partner.create).not.toHaveBeenCalled();
  });

  it("sanitizes support form html before persistence", async () => {
    prismaMock.supportFormConfig.upsert.mockResolvedValue({
      id: 1,
      heading: "AI Agent for Customer Support",
      subheading: "Resolve support queries quickly.",
      submitButtonText: "Book a Demo",
      successMessage: "Thank you. Your request has been received.",
      privacyPolicyText:
        '<p>We respect your privacy.</p><a href="https://example.com/privacy">Read more</a>',
      privacyPolicyUrl: "https://example.com/privacy",
      checkItems: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/support-form-config")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        heading: "AI Agent for Customer Support",
        subheading: "Resolve support queries quickly.",
        checkItems: ["AI-to-human handoff"],
        submitButtonText: "Book a Demo",
        successMessage: "Thank you. Your request has been received.",
        privacyPolicyText:
          '<p>We respect your privacy.</p><script>alert(1)</script><a href="https://example.com/privacy">Read more</a>',
        privacyPolicyUrl: "https://example.com/privacy"
      });

    expect(response.status).toBe(200);
    expect(prismaMock.supportFormConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          privacyPolicyText: expect.not.stringContaining("<script>")
        }),
        create: expect.objectContaining({
          privacyPolicyText: expect.not.stringContaining("<script>")
        })
      })
    );
  });

  it("rejects support form html when no safe text remains after sanitization", async () => {
    const app = createTestApp("admin");
    const response = await request(app)
      .put("/api/admin/support-form-config")
      .set("x-csrf-token", "csrf-token")
      .set("Cookie", "dd_admin_csrf=csrf-token")
      .send({
        heading: "AI Agent for Customer Support",
        subheading: "Resolve support queries quickly.",
        checkItems: ["AI-to-human handoff"],
        submitButtonText: "Book a Demo",
        successMessage: "Thank you. Your request has been received.",
        privacyPolicyText: "<script>alert(1)</script>",
        privacyPolicyUrl: "https://example.com/privacy"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_html_markup");
    expect(prismaMock.supportFormConfig.upsert).not.toHaveBeenCalled();
  });
});
