import { type Request, Router } from "express";
import { SectionKey } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { publicContentCache } from "../../lib/public-cache";
import {
  serializePublicSiteSettings,
  leadSourceFromApi
} from "../../lib/mappers";
import { parseWithSchema } from "../../lib/validation";
import { newId } from "../../lib/ids";
import { AppError } from "../../lib/errors";
import { getOpenAiClient } from "../../lib/openai";
import { env } from "../../config/env";
import { compactObject } from "../../lib/object";
import { type PreviewContext, verifyPreviewToken } from "../../lib/preview";

const leadSubmissionSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  companyName: z.string().trim().min(1).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional(),
  source: z.enum(["support-form", "book-a-call"])
});

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

const chatRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000).optional(),
  messages: z.array(chatMessageSchema).max(20).optional()
});

const chatRateLimitMap = new Map<string, number[]>();
const leadRateLimitMap = new Map<string, number[]>();

export function resetPublicChatRateLimits(): void {
  chatRateLimitMap.clear();
}

export function resetPublicLeadRateLimits(): void {
  leadRateLimitMap.clear();
}

function getRequestIp(request: any): string {
  const forwarded = request.header("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }

  return request.ip || "unknown";
}

function checkChatRateLimit(ipAddress: string): void {
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 15;
  const now = Date.now();
  const recent = (chatRateLimitMap.get(ipAddress) ?? []).filter(
    (time) => now - time < windowMs
  );

  if (recent.length >= maxRequests) {
    throw new AppError(429, "chat_rate_limited", "Too many chat requests");
  }

  recent.push(now);
  chatRateLimitMap.set(ipAddress, recent);
}

function checkLeadRateLimit(ipAddress: string): void {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Max 5 leads per 15 mins to prevent spam
  const now = Date.now();
  const recent = (leadRateLimitMap.get(ipAddress) ?? []).filter(
    (time) => now - time < windowMs
  );

  if (recent.length >= maxRequests) {
    throw new AppError(429, "lead_rate_limited", "Too many lead submissions");
  }

  recent.push(now);
  leadRateLimitMap.set(ipAddress, recent);
}

function isVisible(
  states: Array<{ key: SectionKey; isVisible: boolean }>,
  key: SectionKey
): boolean {
  return states.find((state) => state.key === key)?.isVisible ?? true;
}

function getPreviewContext(request: Request): PreviewContext | null {
  const token = request.query.previewToken;

  if (token === undefined) {
    return null;
  }

  if (Array.isArray(token) || typeof token !== "string" || token.trim().length === 0) {
    throw new AppError(
      400,
      "preview_token_invalid",
      "A valid preview token is required"
    );
  }

  const preview = verifyPreviewToken(token.trim());

  if (!preview) {
    throw new AppError(
      403,
      "preview_token_invalid",
      "Preview token is invalid or expired"
    );
  }

  return preview;
}

function shouldExposeSection(
  preview: PreviewContext | null,
  states: Array<{ key: SectionKey; isVisible: boolean }>,
  key: SectionKey
) {
  return Boolean(preview) || isVisible(states, key);
}

function stripPublicationStatus<T extends { publicationStatus?: unknown }>(
  record: T
): Omit<T, "publicationStatus"> {
  const { publicationStatus: _publicationStatus, ...rest } = record;

  return rest;
}

function normalizePreviewRecord<T extends Record<string, unknown>>(
  record: T,
  preview: PreviewContext | null
): T {
  if (!preview || !("isActive" in record)) {
    return record;
  }

  return {
    ...record,
    isActive: true
  };
}

function serializeSectionStatesForResponse<
  T extends { isVisible: boolean }
>(sectionStates: T[], preview: PreviewContext | null): T[] {
  if (!preview) {
    return sectionStates;
  }

  return sectionStates.map((state) => ({
    ...state,
    isVisible: true
  }));
}

function buildPreviewMetadata(preview: PreviewContext | null) {
  if (!preview) {
    return {};
  }

  return {
    preview: {
      enabled: true,
      expiresAt: preview.expiresAt,
      includesDrafts: true,
      includesHiddenSections: true
    }
  };
}

export function createPublicContentRouter(): Router {
  const router = Router();

  async function fetchSectionData(key: SectionKey | "SITE_SETTINGS" | "SECTION_CONFIG" | "RATING_SUMMARY", preview: PreviewContext | null) {
    const [sectionStates, heroContent, siteSettings, sectionConfig, ratingSummary] =
      await Promise.all([
        prisma.sectionState.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.heroContent.findUniqueOrThrow({
          where: { id: 1 },
          include: { heroTabs: true, promptTemplates: true }
        }),
        prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.sectionConfig.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.ratingSummary.findUniqueOrThrow({ where: { id: 1 } })
      ]);

    if (key !== "SITE_SETTINGS" && key !== "SECTION_CONFIG" && key !== "RATING_SUMMARY" && !shouldExposeSection(preview, sectionStates, key as SectionKey)) {
      return null;
    }

    switch (key) {
      case "PRODUCT_SHOWCASE_OVERVIEW":
        return {
          headline: heroContent.headline,
          subheadline: heroContent.subheadline,
          ctaText: heroContent.ctaText,
          ctaLink: heroContent.ctaLink,
          promptTemplates: heroContent.promptTemplates
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.value)
        };
      case "HERO_SECTION":
        return {
          heroTabs: heroContent.heroTabs
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              label: item.label,
              image: item.image ?? null,
              content: item.content ?? null
            })),
          heroHeading: heroContent.heroHeading,
          heroBackgroundImage: heroContent.heroBackgroundImage,
          heroDashboardImage: heroContent.heroDashboardImage
        };
      case "PRODUCT_SHOWCASE_SECTION": {
        const products = await prisma.productCard.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        });
        return products.map(stripPublicationStatus);
      }
      case "PARTNERSHIP_SECTION": {
        const partners = await prisma.partner.findMany({
          ...(preview
            ? {}
            : { where: { isActive: true, publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        });
        return partners.map((partner) =>
          stripPublicationStatus(normalizePreviewRecord(partner, preview))
        );
      }
      case "VOICE_AGENTS_SECTION": {
        const scenarios = await prisma.voiceScenario.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        });
        return scenarios.map(stripPublicationStatus);
      }
      case "AUTOMATION_ENGINES_SECTION": {
        const engines = await prisma.automationEngine.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          include: { bulletPoints: true },
          orderBy: { sortOrder: "asc" }
        });
        return engines.map((engine) => ({
          ...stripPublicationStatus(engine),
          bulletPoints: engine.bulletPoints
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.value)
        }));
      }
      case "MODEL_CREATION_GRID_SECTION": {
        const capabilities = await prisma.capabilityCard.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
        });
        return capabilities.map(stripPublicationStatus);
      }
      case "ROI_SNAPSHOT_SECTION": {
        const roiIndustries = await prisma.industryROI.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          include: { useCases: true },
          orderBy: { sortOrder: "asc" }
        });
        return roiIndustries.map((industry) => ({
          ...stripPublicationStatus(industry),
          useCases: industry.useCases
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.value)
        }));
      }
      case "PROCESS_STEPS_SECTION": {
        const steps = await prisma.processStep.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        });
        return steps.map(stripPublicationStatus);
      }
      case "POWERFUL_PRODUCTS_OVERVIEW_SECTION": {
        const features = await prisma.productFeature.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
        });
        return features.map(stripPublicationStatus);
      }
      case "CALLER_SHOWCASE_SECTION": {
        const callers = await prisma.callerProfile.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        });
        return callers.map(stripPublicationStatus);
      }
      case "TESTIMONIALS_SECTION": {
        const testimonials = await prisma.testimonial.findMany({
          ...(preview
            ? {}
            : { where: { isActive: true, publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        });
        return testimonials.map((testimonial) =>
          stripPublicationStatus(normalizePreviewRecord(testimonial, preview))
        );
      }
      case "FAQ_SECTION": {
        const [categories, items] = await Promise.all([
          prisma.faqCategory.findMany({
            ...(preview ? {} : { where: { publicationStatus: "published" } }),
            orderBy: { sortOrder: "asc" }
          }),
          prisma.faqItem.findMany({
            ...(preview
              ? {}
              : { where: { isActive: true, publicationStatus: "published" } }),
            include: { category: true },
            orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }]
          })
        ]);
        return categories.map((category) => ({
          id: category.id,
          label: category.label,
          sortOrder: category.sortOrder,
          items: items
            .filter((item) => item.categoryId === category.id)
            .map((item) => normalizePreviewRecord(item, preview))
        }));
      }
      case "INTEGRATIONS_SECTION": {
        const integrations = await prisma.integration.findMany({
          ...(preview
            ? {}
            : { where: { isActive: true, publicationStatus: "published" } }),
          orderBy: [{ row: "asc" }, { sortOrder: "asc" }]
        });
        return integrations.map((integration) =>
          stripPublicationStatus(normalizePreviewRecord(integration, preview))
        );
      }
      case "SUPPORT_LEAD_FORM_SECTION": {
        const config = await prisma.supportFormConfig.findUniqueOrThrow({
          where: { id: 1 },
          include: { checkItems: true }
        });
        return {
          heading: config.heading,
          subheading: config.subheading,
          checkItems: config.checkItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.value),
          submitButtonText: config.submitButtonText,
          successMessage: config.successMessage,
          privacyPolicyText: config.privacyPolicyText,
          privacyPolicyUrl: config.privacyPolicyUrl
        };
      }
      case "SITE_SETTINGS":
        return serializePublicSiteSettings(siteSettings);
      case "SECTION_CONFIG":
        return sectionConfig;
      case "RATING_SUMMARY":
        return ratingSummary;
      default:
        return null;
    }
  }

  router.get("/home", async (request, response) => {
    const preview = getPreviewContext(request);
    const cacheKey = "public:home";
    const cached = preview ? null : publicContentCache.get(cacheKey);

    if (cached) {
      response.json(cached);
      return;
    }

    if (preview) {
      response.set("Cache-Control", "no-store");
    }

    const [
      siteSettings,
      heroContent,
      sectionConfig,
      ratingSummary,
      sectionStates,
      products,
      partners,
      voiceScenarios,
      automationEngines,
      capabilities,
      roiIndustries,
      processSteps,
      productFeatures,
      callers,
      testimonials,
      faqCategories,
      faqItems,
      integrations,
      supportFormConfig
    ] = await Promise.all([
      prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.heroContent.findUniqueOrThrow({
        where: { id: 1 },
        include: { heroTabs: true, promptTemplates: true }
      }),
      prisma.sectionConfig.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.ratingSummary.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.sectionState.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.productCard.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.partner.findMany({
        ...(preview
          ? {}
          : { where: { isActive: true, publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.voiceScenario.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.automationEngine.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        include: { bulletPoints: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.capabilityCard.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
      }),
      prisma.industryROI.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        include: { useCases: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.processStep.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.productFeature.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
      }),
      prisma.callerProfile.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.testimonial.findMany({
        ...(preview
          ? {}
          : { where: { isActive: true, publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.faqCategory.findMany({
        ...(preview ? {} : { where: { publicationStatus: "published" } }),
        orderBy: { sortOrder: "asc" }
      }),
      prisma.faqItem.findMany({
        ...(preview
          ? {}
          : { where: { isActive: true, publicationStatus: "published" } }),
        include: { category: true },
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }]
      }),
      prisma.integration.findMany({
        ...(preview
          ? {}
          : { where: { isActive: true, publicationStatus: "published" } }),
        orderBy: [{ row: "asc" }, { sortOrder: "asc" }]
      }),
      prisma.supportFormConfig.findUniqueOrThrow({
        where: { id: 1 },
        include: { checkItems: true }
      })
    ]);

    const faqData = faqCategories.map((category) => ({
      id: category.id,
      label: category.label,
      sortOrder: category.sortOrder,
      items: faqItems
        .filter((item) => item.categoryId === category.id)
        .map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          sortOrder: item.sortOrder
        }))
    }));

    const payload = {
      data: {
        ...buildPreviewMetadata(preview),
        siteSettings: serializePublicSiteSettings(siteSettings),
        sectionConfig,
        ratingSummary,
        sectionStates: serializeSectionStatesForResponse(sectionStates, preview),
        ...(shouldExposeSection(preview, sectionStates, "PRODUCT_SHOWCASE_OVERVIEW") && {
          heroOverview: {
            headline: heroContent.headline,
            subheadline: heroContent.subheadline,
            ctaText: heroContent.ctaText,
            ctaLink: heroContent.ctaLink,
            promptTemplates: heroContent.promptTemplates
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => item.value)
          }
        }),
        ...(shouldExposeSection(preview, sectionStates, "HERO_SECTION") && {
          heroSection: {
            heroTabs: heroContent.heroTabs
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => ({
                label: item.label,
                image: item.image,
                content: item.content
              })),
            heroHeading: heroContent.heroHeading,
            heroBackgroundImage: heroContent.heroBackgroundImage,
            heroDashboardImage: heroContent.heroDashboardImage
          }
        }),
        ...(shouldExposeSection(preview, sectionStates, "PRODUCT_SHOWCASE_SECTION") && {
          products: products.map(stripPublicationStatus)
        }),
        ...(shouldExposeSection(preview, sectionStates, "PARTNERSHIP_SECTION") && {
          partners: partners.map((partner) =>
            stripPublicationStatus(normalizePreviewRecord(partner, preview))
          )
        }),
        ...(shouldExposeSection(preview, sectionStates, "VOICE_AGENTS_SECTION") && {
          voiceScenarios: voiceScenarios.map(stripPublicationStatus)
        }),
        ...(shouldExposeSection(preview, sectionStates, "AUTOMATION_ENGINES_SECTION") && {
          automationEngines: automationEngines.map((engine) => ({
            ...stripPublicationStatus(engine),
            bulletPoints: engine.bulletPoints
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => item.value)
          }))
        }),
        ...(shouldExposeSection(preview, sectionStates, "MODEL_CREATION_GRID_SECTION") && {
          capabilities: capabilities.map(stripPublicationStatus)
        }),
        ...(shouldExposeSection(preview, sectionStates, "ROI_SNAPSHOT_SECTION") && {
          roiIndustries: roiIndustries.map((industry) => ({
            ...stripPublicationStatus(industry),
            useCases: industry.useCases
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => item.value)
          }))
        }),
        ...(shouldExposeSection(preview, sectionStates, "PROCESS_STEPS_SECTION") && {
          processSteps: processSteps.map(stripPublicationStatus)
        }),
        ...(shouldExposeSection(preview, sectionStates, "POWERFUL_PRODUCTS_OVERVIEW_SECTION") && {
          productFeatures: productFeatures.map(stripPublicationStatus)
        }),
        ...(shouldExposeSection(preview, sectionStates, "CALLER_SHOWCASE_SECTION") && {
          callers: callers.map(stripPublicationStatus)
        }),
        ...(shouldExposeSection(preview, sectionStates, "TESTIMONIALS_SECTION") && {
          testimonials: testimonials.map((testimonial) =>
            stripPublicationStatus(normalizePreviewRecord(testimonial, preview))
          )
        }),
        ...(shouldExposeSection(preview, sectionStates, "FAQ_SECTION") && {
          faq: faqData.map((category) => ({
            ...category,
            items: category.items.map((item) => normalizePreviewRecord(item, preview))
          }))
        }),
        ...(shouldExposeSection(preview, sectionStates, "INTEGRATIONS_SECTION") && {
          integrations: integrations.map((integration) =>
            stripPublicationStatus(normalizePreviewRecord(integration, preview))
          )
        }),
        ...(shouldExposeSection(preview, sectionStates, "SUPPORT_LEAD_FORM_SECTION") && {
          supportFormConfig: {
            heading: supportFormConfig.heading,
            subheading: supportFormConfig.subheading,
            checkItems: supportFormConfig.checkItems
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => item.value),
            submitButtonText: supportFormConfig.submitButtonText,
            successMessage: supportFormConfig.successMessage,
            privacyPolicyText: supportFormConfig.privacyPolicyText,
            privacyPolicyUrl: supportFormConfig.privacyPolicyUrl
          }
        })
      }
    };

    if (!preview) {
      publicContentCache.set(cacheKey, payload);
    }
    response.json(payload);
  });

  router.get("/site-settings", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("SITE_SETTINGS", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/hero", async (request, response) => {
    const preview = getPreviewContext(request);
    const overview = await fetchSectionData("PRODUCT_SHOWCASE_OVERVIEW", preview);
    const section = await fetchSectionData("HERO_SECTION", preview);
    response.json({
      data: { overview, section },
      ...buildPreviewMetadata(preview)
    });
  });

  router.get("/products", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("PRODUCT_SHOWCASE_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/partners", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("PARTNERSHIP_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/voice-scenarios", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("VOICE_AGENTS_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/automation-engines", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("AUTOMATION_ENGINES_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/capabilities", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("MODEL_CREATION_GRID_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/roi-industries", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("ROI_SNAPSHOT_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/process-steps", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("PROCESS_STEPS_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/product-features", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("POWERFUL_PRODUCTS_OVERVIEW_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/callers", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("CALLER_SHOWCASE_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/testimonials", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("TESTIMONIALS_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/faq", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("FAQ_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/integrations", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("INTEGRATIONS_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/support-form", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("SUPPORT_LEAD_FORM_SECTION", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/rating-summary", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("RATING_SUMMARY", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/section-config", async (request, response) => {
    const preview = getPreviewContext(request);
    const data = await fetchSectionData("SECTION_CONFIG", preview);
    response.json({ data, ...buildPreviewMetadata(preview) });
  });

  router.get("/sections/:key", async (request, response) => {
    const key = request.params.key as any;
    const preview = getPreviewContext(request);

    const sectionData = await fetchSectionData(key, preview);
    
    if (sectionData === null && key !== "SITE_SETTINGS" && key !== "SECTION_CONFIG" && key !== "RATING_SUMMARY" && !Object.values(SectionKey).includes(key)) {
       throw new AppError(400, "invalid_section_key", `Invalid section key: ${key}`);
    }

    response.json({
      data: sectionData,
      ...buildPreviewMetadata(preview)
    });
  });

  router.get("/navigation", async (request, response) => {
    const preview = getPreviewContext(request);
    const cacheKey = "public:navigation";
    const cached = preview ? null : publicContentCache.get(cacheKey);

    if (cached) {
      response.json(cached);
      return;
    }

    if (preview) {
      response.set("Cache-Control", "no-store");
    }

    const [siteSettings, sectionStates, navigationItems, megaMenuItems] =
      await Promise.all([
        prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.sectionState.findMany(),
        prisma.navigationItem.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: { sortOrder: "asc" }
        }),
        prisma.megaMenuItem.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
        })
      ]);

    const payload = {
      data: {
        ...buildPreviewMetadata(preview),
        isVisible: shouldExposeSection(preview, sectionStates, "HEADER"),
        siteSettings: serializePublicSiteSettings(siteSettings),
        navigationItems: navigationItems.map((item) =>
          stripPublicationStatus(normalizePreviewRecord(item, preview))
        ),
        megaMenu: {
          platforms: megaMenuItems
            .filter((item) => item.column === "platforms")
            .map((item) =>
              stripPublicationStatus(normalizePreviewRecord(item, preview))
            ),
          useCases: megaMenuItems
            .filter((item) => item.column === "useCases")
            .map((item) =>
              stripPublicationStatus(normalizePreviewRecord(item, preview))
            ),
          customers: megaMenuItems
            .filter((item) => item.column === "customers")
            .map((item) =>
              stripPublicationStatus(normalizePreviewRecord(item, preview))
            )
        }
      }
    };

    if (!preview) {
      publicContentCache.set(cacheKey, payload);
    }
    response.json(payload);
  });

  router.get("/footer", async (request, response) => {
    const preview = getPreviewContext(request);
    const cacheKey = "public:footer";
    const cached = preview ? null : publicContentCache.get(cacheKey);

    if (cached) {
      response.json(cached);
      return;
    }

    if (preview) {
      response.set("Cache-Control", "no-store");
    }

    const [siteSettings, sectionConfig, sectionStates, footerLinkGroups] =
      await Promise.all([
        prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.sectionConfig.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.sectionState.findMany(),
        prisma.footerLinkGroup.findMany({
          ...(preview ? {} : { where: { publicationStatus: "published" } }),
          include: { links: true },
          orderBy: { sortOrder: "asc" }
        })
      ]);

    const payload = {
      data: {
        ...buildPreviewMetadata(preview),
        isVisible: shouldExposeSection(
          preview,
          sectionStates,
          "SITE_FOOTER_SECTION"
        ),
        siteSettings: serializePublicSiteSettings(siteSettings),
        footerTagline: sectionConfig.footerTagline,
        footerBrandText: sectionConfig.footerBrandText,
        linkGroups: footerLinkGroups.map((group) => ({
          ...stripPublicationStatus(normalizePreviewRecord(group, preview)),
          links: group.links
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((link) => ({
              id: link.id,
              label: link.label,
              href: link.href,
              sortOrder: link.sortOrder
            }))
        }))
      }
    };

    if (!preview) {
      publicContentCache.set(cacheKey, payload);
    }
    response.json(payload);
  });

  router.post("/leads", async (request, response) => {
    const ipAddress = getRequestIp(request);
    checkLeadRateLimit(ipAddress);

    const input = parseWithSchema(leadSubmissionSchema, request.body);
    const lead = await prisma.leadSubmission.create({
      data: {
        id: newId(),
        fullName: input.fullName,
        companyName: input.companyName,
        email: input.email.toLowerCase().trim(),
        ...compactObject({
          phone: input.phone ?? null
        }),
        source: leadSourceFromApi(input.source),
        status: "new"
      }
    });

    response.status(201).json({
      data: {
        id: lead.id,
        status: lead.status,
        successMessage: "Thank you. Your request has been received."
      }
    });
  });

  router.post("/chat", async (request, response) => {
    const input = parseWithSchema(chatRequestSchema, request.body);
    const ipAddress = getRequestIp(request);

    checkChatRateLimit(ipAddress);

    const siteSettings = await prisma.siteSettings.findUniqueOrThrow({
      where: { id: 1 }
    });
    const client = getOpenAiClient();

    if (!client || !env.OPENAI_API_KEY) {
      throw new AppError(
        503,
        "chat_not_configured",
        "Chat provider is not configured"
      );
    }

    const messages = input.messages?.length
      ? input.messages
      : input.prompt
        ? [{ role: "user" as const, content: input.prompt }]
        : [];

    if (messages.length === 0) {
      throw new AppError(
        400,
        "chat_empty",
        "A prompt or messages array is required"
      );
    }

    const result = await client.chat.completions.create({
      model: siteSettings.chatModel || env.OPENAI_CHAT_MODEL_DEFAULT,
      messages: [
        { role: "system", content: siteSettings.chatSystemPrompt },
        ...messages
      ]
    });

    response.json({
      data: {
        reply: result.choices[0]?.message?.content ?? "",
        model: result.model
      }
    });
  });

  return router;
}
