import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler, notFoundHandler } from "../../middleware/error-handler";

const prismaMock = {
  leadSubmission: {
    create: vi.fn()
  },
  siteSettings: {
    findUniqueOrThrow: vi.fn()
  },
  heroContent: {
    findUniqueOrThrow: vi.fn()
  },
  sectionConfig: {
    findUniqueOrThrow: vi.fn()
  },
  ratingSummary: {
    findUniqueOrThrow: vi.fn()
  },
  sectionState: {
    findMany: vi.fn()
  },
  productCard: {
    findMany: vi.fn()
  },
  partner: {
    findMany: vi.fn()
  },
  voiceScenario: {
    findMany: vi.fn()
  },
  automationEngine: {
    findMany: vi.fn()
  },
  capabilityCard: {
    findMany: vi.fn()
  },
  industryROI: {
    findMany: vi.fn()
  },
  processStep: {
    findMany: vi.fn()
  },
  productFeature: {
    findMany: vi.fn()
  },
  callerProfile: {
    findMany: vi.fn()
  },
  testimonial: {
    findMany: vi.fn()
  },
  faqCategory: {
    findMany: vi.fn()
  },
  faqItem: {
    findMany: vi.fn()
  },
  integration: {
    findMany: vi.fn()
  },
  supportFormConfig: {
    findUniqueOrThrow: vi.fn()
  },
  navigationItem: {
    findMany: vi.fn()
  },
  megaMenuItem: {
    findMany: vi.fn()
  },
  footerLinkGroup: {
    findMany: vi.fn()
  }
};

const getOpenAiClientMock = vi.fn();

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("../../lib/openai", () => ({
  getOpenAiClient: getOpenAiClientMock
}));

let createPublicContentRouter: typeof import("./public-content.routes").createPublicContentRouter;
let resetPublicChatRateLimits: typeof import("./public-content.routes").resetPublicChatRateLimits;
let publicContentCache: typeof import("../../lib/public-cache").publicContentCache;
let createPreviewToken: typeof import("../../lib/preview").createPreviewToken;

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
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.TTS_PROVIDER = "disabled";

  ({ createPublicContentRouter, resetPublicChatRateLimits } =
    await import("./public-content.routes"));
  ({ publicContentCache } = await import("../../lib/public-cache"));
  ({ createPreviewToken } = await import("../../lib/preview"));
});

beforeEach(() => {
  vi.clearAllMocks();
  publicContentCache.clear();
  resetPublicChatRateLimits();
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/content", createPublicContentRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function createSiteSettings() {
  return {
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
  };
}

function mockHomeQueries() {
  prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue(
    createSiteSettings()
  );
  prismaMock.heroContent.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    headline: "Scale with AI",
    subheadline: "Automate support and sales",
    ctaText: "Book a Call",
    ctaLink: "/book-a-call",
    heroHeading: "One dashboard for every customer touchpoint",
    heroBackgroundImage: "https://example.com/hero-bg.png",
    heroDashboardImage: "https://example.com/dashboard.png",
    heroTabs: [
      { id: "tab_1", label: "Chatzify", sortOrder: 0 },
      { id: "tab_2", label: "VoiceAgent", sortOrder: 1 }
    ],
    promptTemplates: [
      { id: "prompt_1", value: "Qualify a lead", sortOrder: 0 }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  prismaMock.sectionConfig.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    voiceAgentsHeading: "Voice agents",
    voiceAgentsSubheading: "Around the clock",
    voiceAgentsBodyText: "Never miss a call.",
    automationHeading: "Automation engines",
    automationSubheading: "Three products",
    automationCtaBannerText: "Create a flawless experience",
    automationCtaBannerButton: "Book a Call",
    modelCreationLine1: "Create your",
    modelCreationLine2: "Model",
    modelCreationLine3: "With AI",
    processStepsHeading: "AI & Automation Step",
    processStepsSubheading: "Client Satisfaction of Our First Priority.",
    productsOverviewHeading: "Powerful AI Products",
    productsOverviewSubheading: "Built to automate your business",
    productFeaturesCenterImageUrl: "https://example.com/center.png",
    callerShowcaseHeading: "Make that call",
    callerShowcaseSubheading: "Meet Paul and Cassie",
    testimonialsHeading: "Real Stories, Real Results",
    faqHeading: "Have questions?",
    integrationsHeading: "Integrations",
    integrationsSubheading: "Use the tools you already know",
    integrationsCtaText: "Find more",
    partnershipHeading: "Trusted by companies of all sizes",
    roiBadgeText: "Industry Use Cases",
    roiHeading: "ROI Snapshot by Industry",
    footerTagline: "AI-powered automation",
    footerBrandText: "Deepdale"
  });
  prismaMock.ratingSummary.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    score: "4.9",
    reviewCount: "600+ Reviews",
    starCount: 5
  });
  prismaMock.sectionState.findMany.mockResolvedValue([
    { key: "PRODUCT_SHOWCASE_OVERVIEW", isVisible: true, sortOrder: 0 },
    { key: "HERO_SECTION", isVisible: false, sortOrder: 1 },
    { key: "PARTNERSHIP_SECTION", isVisible: true, sortOrder: 2 },
    { key: "TESTIMONIALS_SECTION", isVisible: true, sortOrder: 3 },
    { key: "FAQ_SECTION", isVisible: true, sortOrder: 4 },
    { key: "SUPPORT_LEAD_FORM_SECTION", isVisible: true, sortOrder: 5 }
  ]);
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
  prismaMock.partner.findMany.mockResolvedValue([
    {
      id: "partner_1",
      name: "Acme",
      logoSvg: "<svg></svg>",
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  prismaMock.voiceScenario.findMany.mockResolvedValue([]);
  prismaMock.automationEngine.findMany.mockResolvedValue([]);
  prismaMock.capabilityCard.findMany.mockResolvedValue([]);
  prismaMock.industryROI.findMany.mockResolvedValue([]);
  prismaMock.processStep.findMany.mockResolvedValue([]);
  prismaMock.productFeature.findMany.mockResolvedValue([]);
  prismaMock.callerProfile.findMany.mockResolvedValue([]);
  prismaMock.testimonial.findMany.mockResolvedValue([
    {
      id: "testimonial_1",
      quote: "Support costs dropped 60%.",
      author: "Parvej Ahmed",
      title: "Creative Director",
      avatar: null,
      rating: 5,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  prismaMock.faqCategory.findMany.mockResolvedValue([
    {
      id: "faq_cat_1",
      label: "AI Voice Agent",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  prismaMock.faqItem.findMany.mockResolvedValue([
    {
      id: "faq_1",
      categoryId: "faq_cat_1",
      question: "How does it work?",
      answer: "With automation.",
      sortOrder: 0,
      isActive: true,
      category: {
        id: "faq_cat_1",
        label: "AI Voice Agent",
        sortOrder: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  prismaMock.integration.findMany.mockResolvedValue([]);
  prismaMock.supportFormConfig.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    heading: "AI Agent for Customer Support",
    subheading: "Resolve 70% of support queries.",
    submitButtonText: "Book a Demo",
    successMessage: "Thank you. Your request has been received.",
    privacyPolicyText: "<p>We respect your privacy.</p>",
    privacyPolicyUrl: "https://example.com/privacy",
    checkItems: [{ id: "check_1", value: "AI-to-human handoff", sortOrder: 0 }],
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

describe("public content routes", () => {
  it("creates public leads with mapped source values", async () => {
    prismaMock.leadSubmission.create.mockResolvedValue({
      id: "lead_1",
      fullName: "Maya Sultana",
      companyName: "Nova Clinic",
      email: "maya@example.com",
      phone: null,
      source: "support_form",
      status: "new",
      notes: null,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createTestApp();
    const response = await request(app).post("/api/content/leads").send({
      fullName: "Maya Sultana",
      companyName: "Nova Clinic",
      email: "maya@example.com",
      source: "support-form"
    });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe("lead_1");
    expect(prismaMock.leadSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "support_form",
          status: "new"
        })
      })
    );
  });

  it("reuses cached home content and excludes hidden sections", async () => {
    mockHomeQueries();

    const app = createTestApp();
    const firstResponse = await request(app).get("/api/content/home");
    const secondResponse = await request(app).get("/api/content/home");

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body.data.siteSettings).not.toHaveProperty(
      "chatSystemPrompt"
    );
    expect(firstResponse.body.data.heroOverview.promptTemplates).toEqual([
      "Qualify a lead"
    ]);
    expect(firstResponse.body.data).not.toHaveProperty("heroSection");
    expect(firstResponse.body.data.supportFormConfig.checkItems).toEqual([
      "AI-to-human handoff"
    ]);
    expect(prismaMock.siteSettings.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(prismaMock.heroContent.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(prismaMock.testimonial.findMany).toHaveBeenCalledWith({
      where: { isActive: true, publicationStatus: "published" },
      orderBy: { sortOrder: "asc" }
    });
    expect(prismaMock.faqItem.findMany).toHaveBeenCalledWith({
      where: { isActive: true, publicationStatus: "published" },
      include: { category: true },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }]
    });
    expect(prismaMock.productCard.findMany).toHaveBeenCalledWith({
      where: { publicationStatus: "published" },
      orderBy: { sortOrder: "asc" }
    });
    expect(firstResponse.body.data.products[0]).not.toHaveProperty(
      "publicationStatus"
    );
  });

  it("returns hidden and draft content in preview mode without caching", async () => {
    mockHomeQueries();
    prismaMock.productCard.findMany.mockResolvedValue([
      {
        id: "product_draft",
        brand: "Draft product",
        image: "https://example.com/draft-product.png",
        title: "Draft card",
        description: "Preview-only product",
        gradientPreset: "ocean-blue",
        buttonGradientPreset: "gold-lift",
        sortOrder: 0,
        publicationStatus: "draft",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    prismaMock.partner.findMany.mockResolvedValue([
      {
        id: "partner_draft",
        name: "Hidden partner",
        logoSvg: "<svg></svg>",
        sortOrder: 0,
        isActive: false,
        publicationStatus: "draft",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    const previewToken = createPreviewToken({
      userId: "user_editor",
      role: "editor"
    }).token;

    const app = createTestApp();
    const response = await request(app)
      .get("/api/content/home")
      .query({ previewToken });

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.body.data.preview).toEqual({
      enabled: true,
      expiresAt: expect.any(String),
      includesDrafts: true,
      includesHiddenSections: true
    });
    expect(response.body.data.heroSection).toBeTruthy();
    expect(
      response.body.data.sectionStates.every(
        (section: { isVisible: boolean }) => section.isVisible
      )
    ).toBe(true);
    expect(prismaMock.productCard.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" }
    });
    expect(prismaMock.partner.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" }
    });
    expect(response.body.data.products[0]).not.toHaveProperty(
      "publicationStatus"
    );
    expect(response.body.data.partners[0].isActive).toBe(true);
  });

  it("returns 503 for chat when the provider is not configured", async () => {
    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue(
      createSiteSettings()
    );
    getOpenAiClientMock.mockReturnValue(null);

    const app = createTestApp();
    const response = await request(app).post("/api/content/chat").send({
      prompt: "Tell me about Deepdale"
    });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("chat_not_configured");
  });

  it("rate limits chat requests by client ip", async () => {
    const createCompletionMock = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Deepdale can help with that." } }],
      model: "gpt-4o-mini"
    });

    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue(
      createSiteSettings()
    );
    getOpenAiClientMock.mockReturnValue({
      chat: {
        completions: {
          create: createCompletionMock
        }
      }
    });

    const app = createTestApp();
    const ipAddress = "203.0.113.55";

    for (let index = 0; index < 15; index += 1) {
      const response = await request(app)
        .post("/api/content/chat")
        .set("x-forwarded-for", ipAddress)
        .send({
          prompt: "Tell me about Deepdale"
        });

      expect(response.status).toBe(200);
      expect(response.body.data.reply).toBe("Deepdale can help with that.");
    }

    const blockedResponse = await request(app)
      .post("/api/content/chat")
      .set("x-forwarded-for", ipAddress)
      .send({
        prompt: "Tell me about Deepdale"
      });

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.error.code).toBe("chat_rate_limited");
    expect(createCompletionMock).toHaveBeenCalledTimes(15);
  });

  it("groups navigation content by mega menu column", async () => {
    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue(
      createSiteSettings()
    );
    prismaMock.sectionState.findMany.mockResolvedValue([
      { key: "HEADER", isVisible: true, sortOrder: 16 }
    ]);
    prismaMock.navigationItem.findMany.mockResolvedValue([
      {
        id: "nav_1",
        label: "Platform",
        href: null,
        hasDropdown: true,
        sortOrder: 0
      }
    ]);
    prismaMock.megaMenuItem.findMany.mockResolvedValue([
      {
        id: "mm_1",
        column: "platforms",
        title: "WhatsApp AI Chatbot",
        description: "Resolve queries instantly on WhatsApp.",
        iconName: "MessageSquare",
        iconColor: "#2ABF62",
        isNew: true,
        link: "/platforms/whatsapp",
        sortOrder: 0
      },
      {
        id: "mm_2",
        column: "customers",
        title: "Healthcare",
        description: "Automate scheduling and intake for clinics.",
        iconName: "Stethoscope",
        iconColor: "#087A72",
        isNew: false,
        link: "/customers/healthcare",
        sortOrder: 0
      }
    ]);

    const app = createTestApp();
    const response = await request(app).get("/api/content/navigation");

    expect(response.status).toBe(200);
    expect(response.body.data.isVisible).toBe(true);
    expect(response.body.data.megaMenu.platforms).toHaveLength(1);
    expect(response.body.data.megaMenu.customers).toHaveLength(1);
    expect(prismaMock.navigationItem.findMany).toHaveBeenCalledWith({
      where: { publicationStatus: "published" },
      orderBy: { sortOrder: "asc" }
    });
    expect(prismaMock.megaMenuItem.findMany).toHaveBeenCalledWith({
      where: { publicationStatus: "published" },
      orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
    });
    expect(response.body.data.siteSettings).not.toHaveProperty(
      "chatSystemPrompt"
    );
    expect(response.body.data.navigationItems[0]).not.toHaveProperty(
      "publicationStatus"
    );
  });

  it("returns navigation preview payloads for hidden and draft items", async () => {
    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue(
      createSiteSettings()
    );
    prismaMock.sectionState.findMany.mockResolvedValue([
      { key: "HEADER", isVisible: false, sortOrder: 16 }
    ]);
    prismaMock.navigationItem.findMany.mockResolvedValue([
      {
        id: "nav_draft",
        label: "Draft Platform",
        href: null,
        hasDropdown: true,
        sortOrder: 0,
        publicationStatus: "draft"
      }
    ]);
    prismaMock.megaMenuItem.findMany.mockResolvedValue([
      {
        id: "mm_draft",
        column: "useCases",
        title: "Draft use case",
        description: "Preview-only use case",
        iconName: "Layers",
        iconColor: "#2ABF62",
        isNew: false,
        link: "/draft",
        sortOrder: 0,
        publicationStatus: "draft"
      }
    ]);
    const previewToken = createPreviewToken({
      userId: "user_editor",
      role: "editor"
    }).token;

    const app = createTestApp();
    const response = await request(app)
      .get("/api/content/navigation")
      .query({ previewToken });

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.body.data.preview.enabled).toBe(true);
    expect(response.body.data.isVisible).toBe(true);
    expect(prismaMock.navigationItem.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" }
    });
    expect(prismaMock.megaMenuItem.findMany).toHaveBeenCalledWith({
      orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
    });
    expect(response.body.data.navigationItems[0]).not.toHaveProperty(
      "publicationStatus"
    );
    expect(response.body.data.megaMenu.useCases).toHaveLength(1);
  });

  it("returns footer preview payloads for hidden and draft groups", async () => {
    prismaMock.siteSettings.findUniqueOrThrow.mockResolvedValue(
      createSiteSettings()
    );
    prismaMock.sectionConfig.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      footerTagline: "AI-powered automation",
      footerBrandText: "Deepdale"
    });
    prismaMock.sectionState.findMany.mockResolvedValue([
      { key: "SITE_FOOTER_SECTION", isVisible: false, sortOrder: 15 }
    ]);
    prismaMock.footerLinkGroup.findMany.mockResolvedValue([
      {
        id: "footer_group_draft",
        heading: "Draft group",
        sortOrder: 0,
        publicationStatus: "draft",
        links: [
          {
            id: "footer_link_1",
            label: "Docs",
            href: "/docs",
            sortOrder: 0
          }
        ]
      }
    ]);
    const previewToken = createPreviewToken({
      userId: "user_editor",
      role: "editor"
    }).token;

    const app = createTestApp();
    const response = await request(app)
      .get("/api/content/footer")
      .query({ previewToken });

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.body.data.preview.enabled).toBe(true);
    expect(response.body.data.isVisible).toBe(true);
    expect(prismaMock.footerLinkGroup.findMany).toHaveBeenCalledWith({
      include: { links: true },
      orderBy: { sortOrder: "asc" }
    });
    expect(response.body.data.linkGroups[0]).not.toHaveProperty(
      "publicationStatus"
    );
  });
});
