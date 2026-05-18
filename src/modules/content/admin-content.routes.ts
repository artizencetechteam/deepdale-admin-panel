import { Router } from "express";
import {
  CapabilityColumn,
  LayoutDirection,
  MegaMenuColumn,
  PublicationStatus,
  ProductFeatureColumn,
  SectionKey,
  type SiteSettings
} from "@prisma/client";
import { z } from "zod";

import { buildCollectionRouter, buildSingletonRouter } from "./router-helpers";
import {
  requiredUrlSchema,
  optionalUrlSchema,
  simpleTextSchema,
  longTextSchema,
  sortOrderSchema,
  gradientPresetSchema,
  iconNameSchema
} from "../../schemas/common";
import {
  sanitizeRequiredLimitedHtml,
  sanitizeRequiredSvgMarkup
} from "../../lib/sanitize";
import { serializeSiteSettingsForRole } from "../../lib/mappers";
import { prisma } from "../../lib/prisma";
import { requireCsrf } from "../../middleware/csrf";
import { requireRole } from "../../middleware/roles";
import { parseWithSchema } from "../../lib/validation";
import { publicContentCache } from "../../lib/public-cache";
import { newId } from "../../lib/ids";
import { buildActivitySummary, recordActivity } from "../../lib/activity-log";

const viewerRoles = ["viewer", "editor", "admin", "superadmin"] as const;
const contentWriterRoles = ["editor", "admin", "superadmin"] as const;
const adminRoles = ["admin", "superadmin"] as const;
const publicationStatusInputSchema = z.nativeEnum(PublicationStatus).optional();

const socialLinksSchema = z.object({
  facebook: optionalUrlSchema,
  linkedin: optionalUrlSchema,
  youtube: optionalUrlSchema,
  twitter: optionalUrlSchema
});

const siteSettingsSchema = z.object({
  siteName: simpleTextSchema,
  logoUrl: requiredUrlSchema,
  contactEmail: z.string().email(),
  copyrightText: simpleTextSchema.max(300),
  chatSystemPrompt: longTextSchema,
  chatModel: simpleTextSchema.max(100),
  socialLinks: socialLinksSchema
});

const heroSchema = z.object({
  headline: simpleTextSchema,
  subheadline: longTextSchema.max(1000),
  ctaText: simpleTextSchema.max(80),
  ctaLink: requiredUrlSchema.or(z.string().startsWith("/")),
  promptTemplates: z.array(simpleTextSchema.max(200)).max(12),
  heroTabs: z.array(z.object({
    label: simpleTextSchema.max(60),
    image: optionalUrlSchema,
    content: longTextSchema.max(2000).optional().or(z.literal(""))
  })).min(1).max(6),
  heroHeading: simpleTextSchema.max(200),
  heroBackgroundImage: optionalUrlSchema,
  heroDashboardImage: optionalUrlSchema
});

const productCardSchema = z.object({
  brand: simpleTextSchema.max(100).optional().or(z.literal("")),
  image: requiredUrlSchema,
  title: simpleTextSchema.max(200).optional().or(z.literal("")),
  description: longTextSchema.max(2000).optional().or(z.literal("")),
  gradientPreset: gradientPresetSchema,
  buttonGradientPreset: gradientPresetSchema,
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const partnerSchema = z.object({
  name: simpleTextSchema.max(120),
  logoUrl: requiredUrlSchema,
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
  publicationStatus: publicationStatusInputSchema
});

const voiceScenarioSchema = z.object({
  tag: simpleTextSchema.max(80),
  title: simpleTextSchema.max(120),
  description: longTextSchema.max(2000),
  image: requiredUrlSchema,
  script: longTextSchema.max(10_000),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const automationEngineSchema = z.object({
  tag: simpleTextSchema.max(80),
  title: simpleTextSchema.max(200),
  bulletPoints: z.array(simpleTextSchema.max(240)).min(1).max(10),
  ctaLabel: simpleTextSchema.max(80),
  ctaLink: requiredUrlSchema.or(z.string().startsWith("/")),
  ctaGradientPreset: gradientPresetSchema,
  image: requiredUrlSchema,
  imageAlt: simpleTextSchema.max(200),
  layoutDirection: z.nativeEnum(LayoutDirection),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const capabilityCardSchema = z.object({
  title: simpleTextSchema.max(120),
  description: longTextSchema.max(1000),
  iconName: iconNameSchema,
  iconUrl: optionalUrlSchema,
  column: z.nativeEnum(CapabilityColumn),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const industryRoiSchema = z.object({
  label: simpleTextSchema.max(120),
  image: requiredUrlSchema,
  useCases: z.array(simpleTextSchema.max(120)).min(1).max(8),
  cvr: simpleTextSchema.max(40),
  secondaryMetric: simpleTextSchema.max(40),
  audioLabel: simpleTextSchema.max(80),
  audioDuration: simpleTextSchema.max(20),
  audioFile: optionalUrlSchema,
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const processStepSchema = z.object({
  label: simpleTextSchema.max(20),
  title: simpleTextSchema.max(160),
  description: longTextSchema.max(2000),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const productFeatureSchema = z.object({
  title: simpleTextSchema.max(120),
  subtitle: simpleTextSchema.max(160),
  description: longTextSchema.max(2000),
  iconName: iconNameSchema,
  column: z.nativeEnum(ProductFeatureColumn),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const callerProfileSchema = z.object({
  name: simpleTextSchema.max(120),
  role: simpleTextSchema.max(120),
  image: requiredUrlSchema,
  sampleLine: longTextSchema.max(5000),
  voicePitch: z.number().min(0.5).max(2),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const testimonialSchema = z.object({
  quote: longTextSchema.max(4000),
  author: simpleTextSchema.max(120),
  title: simpleTextSchema.max(120),
  avatar: optionalUrlSchema,
  rating: z.number().int().min(1).max(5).optional().nullable(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
  publicationStatus: publicationStatusInputSchema
});

const ratingSummarySchema = z.object({
  score: simpleTextSchema.max(10),
  reviewCount: simpleTextSchema.max(40),
  starCount: z.number().int().min(1).max(5)
});

const faqCategorySchema = z.object({
  label: simpleTextSchema.max(120),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const faqItemSchema = z.object({
  categoryId: z.string().min(1),
  question: simpleTextSchema.max(200),
  answer: longTextSchema.max(5000),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
  publicationStatus: publicationStatusInputSchema
});

const integrationSchema = z.object({
  name: simpleTextSchema.max(120),
  shortLabel: simpleTextSchema.max(8),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  logoUrl: optionalUrlSchema,
  row: z.number().int().min(1).max(3),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
  publicationStatus: publicationStatusInputSchema
});

const supportFormConfigSchema = z.object({
  heading: simpleTextSchema.max(200),
  subheading: longTextSchema.max(1000),
  checkItems: z.array(simpleTextSchema.max(200)).min(1).max(8),
  submitButtonText: simpleTextSchema.max(80),
  successMessage: longTextSchema.max(1000),
  privacyPolicyText: longTextSchema.max(5000),
  privacyPolicyUrl: requiredUrlSchema
});

const navigationItemSchema = z.object({
  label: simpleTextSchema.max(120),
  href: optionalUrlSchema.or(z.string().startsWith("/")).optional(),
  hasDropdown: z.boolean(),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const megaMenuItemSchema = z.object({
  column: z.nativeEnum(MegaMenuColumn),
  title: simpleTextSchema.max(120),
  description: longTextSchema.max(1000),
  iconName: iconNameSchema,
  iconColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  isNew: z.boolean(),
  link: optionalUrlSchema.or(z.string().startsWith("/")).optional(),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const footerLinkItemSchema = z.object({
  label: simpleTextSchema.max(120),
  href: requiredUrlSchema.or(z.string().startsWith("/")),
  sortOrder: sortOrderSchema
});

const footerLinkGroupSchema = z.object({
  heading: simpleTextSchema.max(120),
  links: z.array(footerLinkItemSchema).max(20),
  sortOrder: sortOrderSchema,
  publicationStatus: publicationStatusInputSchema
});

const sectionConfigSchema = z.object({
  voiceAgentsHeading: simpleTextSchema.max(160),
  voiceAgentsSubheading: simpleTextSchema.max(240),
  voiceAgentsBodyText: longTextSchema.max(1000),
  automationHeading: simpleTextSchema.max(160),
  automationSubheading: simpleTextSchema.max(240),
  automationCtaBannerText: simpleTextSchema.max(160),
  automationCtaBannerButton: simpleTextSchema.max(80),
  modelCreationLine1: simpleTextSchema.max(80),
  modelCreationLine2: simpleTextSchema.max(80),
  modelCreationLine3: simpleTextSchema.max(80),
  processStepsHeading: simpleTextSchema.max(160),
  processStepsSubheading: simpleTextSchema.max(240),
  productsOverviewHeading: simpleTextSchema.max(200),
  productsOverviewSubheading: simpleTextSchema.max(240),
  productFeaturesCenterImageUrl: requiredUrlSchema,
  callerShowcaseHeading: simpleTextSchema.max(160),
  callerShowcaseSubheading: simpleTextSchema.max(240),
  testimonialsHeading: simpleTextSchema.max(200),
  faqHeading: simpleTextSchema.max(200),
  integrationsHeading: simpleTextSchema.max(200),
  integrationsSubheading: simpleTextSchema.max(240),
  integrationsCtaText: simpleTextSchema.max(120),
  partnershipHeading: simpleTextSchema.max(200),
  roiBadgeText: simpleTextSchema.max(80),
  roiHeading: simpleTextSchema.max(200),
  footerTagline: longTextSchema.max(1000),
  footerBrandText: simpleTextSchema.max(120)
});

const sectionStateUpdateSchema = z.object({
  isVisible: z.boolean().optional(),
  sortOrder: sortOrderSchema.optional()
});
const sectionStateReorderSchema = z.array(
  z.object({
    key: z.nativeEnum(SectionKey),
    sortOrder: sortOrderSchema
  })
);

function serializeHero(record: any) {
  return {
    headline: record.headline,
    subheadline: record.subheadline,
    ctaText: record.ctaText,
    ctaLink: record.ctaLink,
    heroTabs: [...record.heroTabs]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        label: item.label,
        image: item.image,
        content: item.content
      })),
    promptTemplates: [...record.promptTemplates]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.value),
    heroHeading: record.heroHeading,
    heroBackgroundImage: record.heroBackgroundImage,
    heroDashboardImage: record.heroDashboardImage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function serializeAutomationEngine(record: any) {
  return {
    id: record.id,
    tag: record.tag,
    title: record.title,
    bulletPoints: [...record.bulletPoints]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.value),
    ctaLabel: record.ctaLabel,
    ctaLink: record.ctaLink,
    ctaGradientPreset: record.ctaGradientPreset,
    image: record.image,
    imageAlt: record.imageAlt,
    layoutDirection: record.layoutDirection,
    sortOrder: record.sortOrder,
    publicationStatus: record.publicationStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function serializeIndustryRoi(record: any) {
  return {
    id: record.id,
    label: record.label,
    image: record.image,
    useCases: [...record.useCases]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.value),
    cvr: record.cvr,
    secondaryMetric: record.secondaryMetric,
    audioLabel: record.audioLabel,
    audioDuration: record.audioDuration,
    audioFile: record.audioFile,
    sortOrder: record.sortOrder,
    publicationStatus: record.publicationStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function serializeSupportFormConfig(record: any) {
  return {
    heading: record.heading,
    subheading: record.subheading,
    checkItems: [...record.checkItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.value),
    submitButtonText: record.submitButtonText,
    successMessage: record.successMessage,
    privacyPolicyText: record.privacyPolicyText,
    privacyPolicyUrl: record.privacyPolicyUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function serializeFooterLinkGroup(record: any) {
  return {
    id: record.id,
    heading: record.heading,
    links: [...record.links]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => ({
        id: link.id,
        label: link.label,
        href: link.href,
        sortOrder: link.sortOrder
      })),
    sortOrder: record.sortOrder,
    publicationStatus: record.publicationStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function createAdminContentRouter(): Router {
  const router = Router();

  router.use(
    "/site-settings",
    buildSingletonRouter({
      path: "/site-settings",
      delegate: "siteSettings",
      updateSchema: siteSettingsSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...adminRoles],
      mapRecord: (record: SiteSettings, request) =>
        serializeSiteSettingsForRole(record, request.auth?.role),
      buildData: (input, request, mode) => ({
        siteName: input.siteName,
        logoUrl: input.logoUrl,
        contactEmail: input.contactEmail,
        copyrightText: input.copyrightText,
        chatSystemPrompt: input.chatSystemPrompt,
        chatModel: input.chatModel,
        socialFacebook: input.socialLinks.facebook ?? null,
        socialLinkedin: input.socialLinks.linkedin ?? null,
        socialYoutube: input.socialLinks.youtube ?? null,
        socialTwitter: input.socialLinks.twitter ?? null,
        updatedByUserId: request.auth?.userId,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId
            }
          : {})
      })
    })
  );

  router.use(
    "/hero",
    buildSingletonRouter({
      path: "/hero",
      delegate: "heroContent",
      updateSchema: heroSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      include: {
        heroTabs: true,
        promptTemplates: true
      },
      mapRecord: serializeHero,
      buildData: (input, request, mode) => ({
        headline: input.headline,
        subheadline: input.subheadline,
        ctaText: input.ctaText,
        ctaLink: input.ctaLink,
        heroHeading: input.heroHeading,
        heroBackgroundImage: input.heroBackgroundImage,
        heroDashboardImage: input.heroDashboardImage,
        heroTabs: {
          ...(mode === "update" ? { deleteMany: {} } : {}),
          create: input.heroTabs.map((tab: any, index: number) => ({
            id: newId(),
            label: tab.label,
            image: tab.image || null,
            content: tab.content || null,
            sortOrder: index
          }))
        },
        promptTemplates: {
          ...(mode === "update" ? { deleteMany: {} } : {}),
          create: input.promptTemplates.map((value, index) => ({
            id: newId(),
            value,
            sortOrder: index
          }))
        },
        updatedByUserId: request.auth?.userId,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId
            }
          : {})
      })
    })
  );

  router.use(
    "/products",
    buildCollectionRouter({
      path: "/products",
      delegate: "productCard",
      createSchema: productCardSchema,
      updateSchema: productCardSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/partners",
    buildCollectionRouter({
      path: "/partners",
      delegate: "partner",
      createSchema: partnerSchema,
      updateSchema: partnerSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      buildData: (input, request, mode) => ({
        name: input.name,
        logoUrl: input.logoUrl,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        publicationStatus: input.publicationStatus,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/voice-scenarios",
    buildCollectionRouter({
      path: "/voice-scenarios",
      delegate: "voiceScenario",
      createSchema: voiceScenarioSchema,
      updateSchema: voiceScenarioSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/automation-engines",
    buildCollectionRouter({
      path: "/automation-engines",
      delegate: "automationEngine",
      createSchema: automationEngineSchema,
      updateSchema: automationEngineSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      include: {
        bulletPoints: true
      },
      mapRecord: serializeAutomationEngine,
      buildData: (input, request, mode) => ({
        tag: input.tag,
        title: input.title,
        ctaLabel: input.ctaLabel,
        ctaLink: input.ctaLink,
        ctaGradientPreset: input.ctaGradientPreset,
        image: input.image,
        imageAlt: input.imageAlt,
        layoutDirection: input.layoutDirection,
        sortOrder: input.sortOrder,
        publicationStatus: input.publicationStatus,
        bulletPoints: {
          ...(mode === "update" ? { deleteMany: {} } : {}),
          create: input.bulletPoints.map((value, index) => ({
            id: newId(),
            value,
            sortOrder: index
          }))
        },
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/capabilities",
    buildCollectionRouter({
      path: "/capabilities",
      delegate: "capabilityCard",
      createSchema: capabilityCardSchema,
      updateSchema: capabilityCardSchema,
      orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/roi-industries",
    buildCollectionRouter({
      path: "/roi-industries",
      delegate: "industryROI",
      createSchema: industryRoiSchema,
      updateSchema: industryRoiSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      include: {
        useCases: true
      },
      mapRecord: serializeIndustryRoi,
      buildData: (input, request, mode) => ({
        label: input.label,
        image: input.image,
        cvr: input.cvr,
        secondaryMetric: input.secondaryMetric,
        audioLabel: input.audioLabel,
        audioDuration: input.audioDuration,
        audioFile: input.audioFile ?? null,
        sortOrder: input.sortOrder,
        publicationStatus: input.publicationStatus,
        useCases: {
          ...(mode === "update" ? { deleteMany: {} } : {}),
          create: input.useCases.map((value, index) => ({
            id: newId(),
            value,
            sortOrder: index
          }))
        },
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/process-steps",
    buildCollectionRouter({
      path: "/process-steps",
      delegate: "processStep",
      createSchema: processStepSchema,
      updateSchema: processStepSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/product-features",
    buildCollectionRouter({
      path: "/product-features",
      delegate: "productFeature",
      createSchema: productFeatureSchema,
      updateSchema: productFeatureSchema,
      orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/callers",
    buildCollectionRouter({
      path: "/callers",
      delegate: "callerProfile",
      createSchema: callerProfileSchema,
      updateSchema: callerProfileSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/testimonials",
    buildCollectionRouter({
      path: "/testimonials",
      delegate: "testimonial",
      createSchema: testimonialSchema,
      updateSchema: testimonialSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      buildData: (input, request, mode) => ({
        quote: input.quote,
        author: input.author,
        title: input.title,
        avatar: input.avatar ?? null,
        rating: input.rating ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        publicationStatus: input.publicationStatus,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/rating-summary",
    buildSingletonRouter({
      path: "/rating-summary",
      delegate: "ratingSummary",
      updateSchema: ratingSummarySchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles]
    })
  );

  router.use(
    "/faq-categories",
    buildCollectionRouter({
      path: "/faq-categories",
      delegate: "faqCategory",
      createSchema: faqCategorySchema,
      updateSchema: faqCategorySchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true
    })
  );

  router.use(
    "/faqs",
    buildCollectionRouter({
      path: "/faqs",
      delegate: "faqItem",
      createSchema: faqItemSchema,
      updateSchema: faqItemSchema,
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      include: {
        category: true
      },
      mapRecord: (record: any) => ({
        id: record.id,
        categoryId: record.categoryId,
        categoryLabel: record.category.label,
        question: record.question,
        answer: record.answer,
        sortOrder: record.sortOrder,
        isActive: record.isActive,
        publicationStatus: record.publicationStatus,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      })
    })
  );

  router.use(
    "/integrations",
    buildCollectionRouter({
      path: "/integrations",
      delegate: "integration",
      createSchema: integrationSchema,
      updateSchema: integrationSchema,
      orderBy: [{ row: "asc" }, { sortOrder: "asc" }],
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      buildData: (input, request, mode) => ({
        name: input.name,
        shortLabel: input.shortLabel,
        color: input.color,
        logoUrl: input.logoUrl ?? null,
        row: input.row,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        publicationStatus: input.publicationStatus,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/support-form-config",
    buildSingletonRouter({
      path: "/support-form-config",
      delegate: "supportFormConfig",
      updateSchema: supportFormConfigSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      include: {
        checkItems: true
      },
      mapRecord: serializeSupportFormConfig,
      buildData: (input, request, mode) => ({
        heading: input.heading,
        subheading: input.subheading,
        submitButtonText: input.submitButtonText,
        successMessage: input.successMessage,
        privacyPolicyText: sanitizeRequiredLimitedHtml(input.privacyPolicyText),
        privacyPolicyUrl: input.privacyPolicyUrl,
        checkItems: {
          ...(mode === "update" ? { deleteMany: {} } : {}),
          create: input.checkItems.map((value, index) => ({
            id: newId(),
            value,
            sortOrder: index
          }))
        },
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/navigation-items",
    buildCollectionRouter({
      path: "/navigation-items",
      delegate: "navigationItem",
      createSchema: navigationItemSchema,
      updateSchema: navigationItemSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      buildData: (input, request, mode) => ({
        label: input.label,
        href: input.href ?? null,
        hasDropdown: input.hasDropdown,
        sortOrder: input.sortOrder,
        publicationStatus: input.publicationStatus,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/mega-menu-items",
    buildCollectionRouter({
      path: "/mega-menu-items",
      delegate: "megaMenuItem",
      createSchema: megaMenuItemSchema,
      updateSchema: megaMenuItemSchema,
      orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      buildData: (input, request, mode) => ({
        column: input.column,
        title: input.title,
        description: input.description,
        iconName: input.iconName,
        iconColor: input.iconColor,
        isNew: input.isNew,
        link: input.link ?? null,
        sortOrder: input.sortOrder,
        publicationStatus: input.publicationStatus,
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/footer-link-groups",
    buildCollectionRouter({
      path: "/footer-link-groups",
      delegate: "footerLinkGroup",
      createSchema: footerLinkGroupSchema,
      updateSchema: footerLinkGroupSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles],
      supportsPublicationStatus: true,
      include: {
        links: true
      },
      mapRecord: serializeFooterLinkGroup,
      buildData: (input, request, mode) => ({
        heading: input.heading,
        sortOrder: input.sortOrder,
        publicationStatus: input.publicationStatus,
        links: {
          ...(mode === "update" ? { deleteMany: {} } : {}),
          create: input.links.map((link) => ({
            id: newId(),
            label: link.label,
            href: link.href,
            sortOrder: link.sortOrder
          }))
        },
        ...(mode === "create"
          ? {
              createdByUserId: request.auth?.userId,
              updatedByUserId: request.auth?.userId
            }
          : {
              updatedByUserId: request.auth?.userId
            })
      })
    })
  );

  router.use(
    "/section-config",
    buildSingletonRouter({
      path: "/section-config",
      delegate: "sectionConfig",
      updateSchema: sectionConfigSchema,
      readRoles: [...viewerRoles],
      writeRoles: [...contentWriterRoles]
    })
  );

  router.get(
    "/section-states",
    requireRole(...viewerRoles),
    async (_request, response) => {
      const states = await prisma.sectionState.findMany({
        orderBy: {
          sortOrder: "asc"
        }
      });

      response.json({
        data: states
      });
    }
  );

  router.patch(
    "/section-states/reorder",
    requireRole(...contentWriterRoles),
    requireCsrf,
    async (request, response) => {
      const payload = parseWithSchema(sectionStateReorderSchema, request.body);
      const auditFields = request.auth?.userId
        ? { updatedByUserId: request.auth.userId }
        : {};

      await prisma.$transaction(
        payload.map((item) =>
          prisma.sectionState.update({
            where: {
              key: item.key
            },
            data: {
              sortOrder: item.sortOrder,
              ...auditFields
            }
          })
        )
      );

      publicContentCache.invalidatePrefix("public:");
      await recordActivity({
        request,
        action: "reorder",
        resourceType: "section-states",
        summary: "Reordered landing page sections",
        metadata: {
          count: payload.length
        }
      });
      response.json({ success: true });
    }
  );

  router.patch(
    "/section-states/:key",
    requireRole(...contentWriterRoles),
    requireCsrf,
    async (request, response) => {
      const key = parseWithSchema(z.nativeEnum(SectionKey), request.params.key);
      const input = parseWithSchema(sectionStateUpdateSchema, request.body);
      const data: Record<string, unknown> = {};

      if (input.isVisible !== undefined) {
        data.isVisible = input.isVisible;
      }

      if (input.sortOrder !== undefined) {
        data.sortOrder = input.sortOrder;
      }

      if (request.auth?.userId) {
        data.updatedByUserId = request.auth.userId;
      }

      const state = await prisma.sectionState.update({
        where: {
          key
        },
        data
      });

      publicContentCache.invalidatePrefix("public:");
      const action =
        input.isVisible !== undefined && input.sortOrder === undefined
          ? "toggle_visibility"
          : "update";
      await recordActivity({
        request,
        action,
        resourceType: "section-states",
        resourceId: state.key,
        resourceLabel: state.key,
        summary:
          action === "toggle_visibility"
            ? input.isVisible
              ? `Enabled section visibility: ${state.key}`
              : `Disabled section visibility: ${state.key}`
            : buildActivitySummary("update", "section-states", state.key),
        metadata: {
          isVisible: input.isVisible,
          sortOrder: input.sortOrder
        }
      });
      response.json({ data: state });
    }
  );

  return router;
}
