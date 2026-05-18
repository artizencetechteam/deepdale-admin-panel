"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminContentRouter = createAdminContentRouter;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router_helpers_1 = require("./router-helpers");
const common_1 = require("../../schemas/common");
const sanitize_1 = require("../../lib/sanitize");
const mappers_1 = require("../../lib/mappers");
const prisma_1 = require("../../lib/prisma");
const csrf_1 = require("../../middleware/csrf");
const roles_1 = require("../../middleware/roles");
const validation_1 = require("../../lib/validation");
const public_cache_1 = require("../../lib/public-cache");
const ids_1 = require("../../lib/ids");
const activity_log_1 = require("../../lib/activity-log");
const viewerRoles = ["viewer", "editor", "admin", "superadmin"];
const contentWriterRoles = ["editor", "admin", "superadmin"];
const adminRoles = ["admin", "superadmin"];
const publicationStatusInputSchema = zod_1.z.nativeEnum(client_1.PublicationStatus).optional();
const socialLinksSchema = zod_1.z.object({
    facebook: common_1.optionalUrlSchema,
    linkedin: common_1.optionalUrlSchema,
    youtube: common_1.optionalUrlSchema,
    twitter: common_1.optionalUrlSchema
});
const siteSettingsSchema = zod_1.z.object({
    siteName: common_1.simpleTextSchema,
    logoUrl: common_1.requiredUrlSchema,
    contactEmail: zod_1.z.string().email(),
    copyrightText: common_1.simpleTextSchema.max(300),
    chatSystemPrompt: common_1.longTextSchema,
    chatModel: common_1.simpleTextSchema.max(100),
    socialLinks: socialLinksSchema
});
const heroSchema = zod_1.z.object({
    headline: common_1.simpleTextSchema,
    subheadline: common_1.longTextSchema.max(1000),
    ctaText: common_1.simpleTextSchema.max(80),
    ctaLink: common_1.requiredUrlSchema.or(zod_1.z.string().startsWith("/")),
    promptTemplates: zod_1.z.array(common_1.simpleTextSchema.max(200)).max(12),
    heroTabs: zod_1.z.array(common_1.simpleTextSchema.max(60)).min(1).max(6),
    heroHeading: common_1.simpleTextSchema.max(200),
    heroBackgroundImage: common_1.requiredUrlSchema,
    heroDashboardImage: common_1.requiredUrlSchema
});
const productCardSchema = zod_1.z.object({
    brand: common_1.simpleTextSchema.max(100),
    image: common_1.requiredUrlSchema,
    title: common_1.simpleTextSchema.max(200),
    description: common_1.longTextSchema.max(2000),
    gradientPreset: common_1.gradientPresetSchema,
    buttonGradientPreset: common_1.gradientPresetSchema,
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const partnerSchema = zod_1.z.object({
    name: common_1.simpleTextSchema.max(120),
    logoSvg: common_1.longTextSchema.max(20_000),
    sortOrder: common_1.sortOrderSchema,
    isActive: zod_1.z.boolean(),
    publicationStatus: publicationStatusInputSchema
});
const voiceScenarioSchema = zod_1.z.object({
    tag: common_1.simpleTextSchema.max(80),
    title: common_1.simpleTextSchema.max(120),
    description: common_1.longTextSchema.max(2000),
    image: common_1.requiredUrlSchema,
    script: common_1.longTextSchema.max(10_000),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const automationEngineSchema = zod_1.z.object({
    tag: common_1.simpleTextSchema.max(80),
    title: common_1.simpleTextSchema.max(200),
    bulletPoints: zod_1.z.array(common_1.simpleTextSchema.max(240)).min(1).max(10),
    ctaLabel: common_1.simpleTextSchema.max(80),
    ctaLink: common_1.requiredUrlSchema.or(zod_1.z.string().startsWith("/")),
    ctaGradientPreset: common_1.gradientPresetSchema,
    image: common_1.requiredUrlSchema,
    imageAlt: common_1.simpleTextSchema.max(200),
    layoutDirection: zod_1.z.nativeEnum(client_1.LayoutDirection),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const capabilityCardSchema = zod_1.z.object({
    title: common_1.simpleTextSchema.max(120),
    description: common_1.longTextSchema.max(1000),
    iconName: common_1.iconNameSchema,
    iconUrl: common_1.optionalUrlSchema,
    column: zod_1.z.nativeEnum(client_1.CapabilityColumn),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const industryRoiSchema = zod_1.z.object({
    label: common_1.simpleTextSchema.max(120),
    image: common_1.requiredUrlSchema,
    useCases: zod_1.z.array(common_1.simpleTextSchema.max(120)).min(1).max(8),
    cvr: common_1.simpleTextSchema.max(40),
    secondaryMetric: common_1.simpleTextSchema.max(40),
    audioLabel: common_1.simpleTextSchema.max(80),
    audioDuration: common_1.simpleTextSchema.max(20),
    audioFile: common_1.optionalUrlSchema,
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const processStepSchema = zod_1.z.object({
    label: common_1.simpleTextSchema.max(20),
    title: common_1.simpleTextSchema.max(160),
    description: common_1.longTextSchema.max(2000),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const productFeatureSchema = zod_1.z.object({
    title: common_1.simpleTextSchema.max(120),
    subtitle: common_1.simpleTextSchema.max(160),
    description: common_1.longTextSchema.max(2000),
    iconName: common_1.iconNameSchema,
    column: zod_1.z.nativeEnum(client_1.ProductFeatureColumn),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const callerProfileSchema = zod_1.z.object({
    name: common_1.simpleTextSchema.max(120),
    role: common_1.simpleTextSchema.max(120),
    image: common_1.requiredUrlSchema,
    sampleLine: common_1.longTextSchema.max(5000),
    voicePitch: zod_1.z.number().min(0.5).max(2),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const testimonialSchema = zod_1.z.object({
    quote: common_1.longTextSchema.max(4000),
    author: common_1.simpleTextSchema.max(120),
    title: common_1.simpleTextSchema.max(120),
    avatar: common_1.optionalUrlSchema,
    rating: zod_1.z.number().int().min(1).max(5).optional().nullable(),
    sortOrder: common_1.sortOrderSchema,
    isActive: zod_1.z.boolean(),
    publicationStatus: publicationStatusInputSchema
});
const ratingSummarySchema = zod_1.z.object({
    score: common_1.simpleTextSchema.max(10),
    reviewCount: common_1.simpleTextSchema.max(40),
    starCount: zod_1.z.number().int().min(1).max(5)
});
const faqCategorySchema = zod_1.z.object({
    label: common_1.simpleTextSchema.max(120),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const faqItemSchema = zod_1.z.object({
    categoryId: zod_1.z.string().min(1),
    question: common_1.simpleTextSchema.max(200),
    answer: common_1.longTextSchema.max(5000),
    sortOrder: common_1.sortOrderSchema,
    isActive: zod_1.z.boolean(),
    publicationStatus: publicationStatusInputSchema
});
const integrationSchema = zod_1.z.object({
    name: common_1.simpleTextSchema.max(120),
    shortLabel: common_1.simpleTextSchema.max(8),
    color: zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    logoUrl: common_1.optionalUrlSchema,
    row: zod_1.z.number().int().min(1).max(3),
    sortOrder: common_1.sortOrderSchema,
    isActive: zod_1.z.boolean(),
    publicationStatus: publicationStatusInputSchema
});
const supportFormConfigSchema = zod_1.z.object({
    heading: common_1.simpleTextSchema.max(200),
    subheading: common_1.longTextSchema.max(1000),
    checkItems: zod_1.z.array(common_1.simpleTextSchema.max(200)).min(1).max(8),
    submitButtonText: common_1.simpleTextSchema.max(80),
    successMessage: common_1.longTextSchema.max(1000),
    privacyPolicyText: common_1.longTextSchema.max(5000),
    privacyPolicyUrl: common_1.requiredUrlSchema
});
const navigationItemSchema = zod_1.z.object({
    label: common_1.simpleTextSchema.max(120),
    href: common_1.optionalUrlSchema.or(zod_1.z.string().startsWith("/")).optional(),
    hasDropdown: zod_1.z.boolean(),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const megaMenuItemSchema = zod_1.z.object({
    column: zod_1.z.nativeEnum(client_1.MegaMenuColumn),
    title: common_1.simpleTextSchema.max(120),
    description: common_1.longTextSchema.max(1000),
    iconName: common_1.iconNameSchema,
    iconColor: zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    isNew: zod_1.z.boolean(),
    link: common_1.optionalUrlSchema.or(zod_1.z.string().startsWith("/")).optional(),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const footerLinkItemSchema = zod_1.z.object({
    label: common_1.simpleTextSchema.max(120),
    href: common_1.requiredUrlSchema.or(zod_1.z.string().startsWith("/")),
    sortOrder: common_1.sortOrderSchema
});
const footerLinkGroupSchema = zod_1.z.object({
    heading: common_1.simpleTextSchema.max(120),
    links: zod_1.z.array(footerLinkItemSchema).max(20),
    sortOrder: common_1.sortOrderSchema,
    publicationStatus: publicationStatusInputSchema
});
const sectionConfigSchema = zod_1.z.object({
    voiceAgentsHeading: common_1.simpleTextSchema.max(160),
    voiceAgentsSubheading: common_1.simpleTextSchema.max(240),
    voiceAgentsBodyText: common_1.longTextSchema.max(1000),
    automationHeading: common_1.simpleTextSchema.max(160),
    automationSubheading: common_1.simpleTextSchema.max(240),
    automationCtaBannerText: common_1.simpleTextSchema.max(160),
    automationCtaBannerButton: common_1.simpleTextSchema.max(80),
    modelCreationLine1: common_1.simpleTextSchema.max(80),
    modelCreationLine2: common_1.simpleTextSchema.max(80),
    modelCreationLine3: common_1.simpleTextSchema.max(80),
    processStepsHeading: common_1.simpleTextSchema.max(160),
    processStepsSubheading: common_1.simpleTextSchema.max(240),
    productsOverviewHeading: common_1.simpleTextSchema.max(200),
    productsOverviewSubheading: common_1.simpleTextSchema.max(240),
    productFeaturesCenterImageUrl: common_1.requiredUrlSchema,
    callerShowcaseHeading: common_1.simpleTextSchema.max(160),
    callerShowcaseSubheading: common_1.simpleTextSchema.max(240),
    testimonialsHeading: common_1.simpleTextSchema.max(200),
    faqHeading: common_1.simpleTextSchema.max(200),
    integrationsHeading: common_1.simpleTextSchema.max(200),
    integrationsSubheading: common_1.simpleTextSchema.max(240),
    integrationsCtaText: common_1.simpleTextSchema.max(120),
    partnershipHeading: common_1.simpleTextSchema.max(200),
    roiBadgeText: common_1.simpleTextSchema.max(80),
    roiHeading: common_1.simpleTextSchema.max(200),
    footerTagline: common_1.longTextSchema.max(1000),
    footerBrandText: common_1.simpleTextSchema.max(120)
});
const sectionStateUpdateSchema = zod_1.z.object({
    isVisible: zod_1.z.boolean().optional(),
    sortOrder: common_1.sortOrderSchema.optional()
});
const sectionStateReorderSchema = zod_1.z.array(zod_1.z.object({
    key: zod_1.z.nativeEnum(client_1.SectionKey),
    sortOrder: common_1.sortOrderSchema
}));
function serializeHero(record) {
    return {
        headline: record.headline,
        subheadline: record.subheadline,
        ctaText: record.ctaText,
        ctaLink: record.ctaLink,
        heroTabs: [...record.heroTabs]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.label),
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
function serializeAutomationEngine(record) {
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
function serializeIndustryRoi(record) {
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
function serializeSupportFormConfig(record) {
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
function serializeFooterLinkGroup(record) {
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
function createAdminContentRouter() {
    const router = (0, express_1.Router)();
    router.use("/site-settings", (0, router_helpers_1.buildSingletonRouter)({
        path: "/site-settings",
        delegate: "siteSettings",
        updateSchema: siteSettingsSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...adminRoles],
        mapRecord: (record, request) => (0, mappers_1.serializeSiteSettingsForRole)(record, request.auth?.role),
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
    }));
    router.use("/hero", (0, router_helpers_1.buildSingletonRouter)({
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
                create: input.heroTabs.map((label, index) => ({
                    id: (0, ids_1.newId)(),
                    label,
                    sortOrder: index
                }))
            },
            promptTemplates: {
                ...(mode === "update" ? { deleteMany: {} } : {}),
                create: input.promptTemplates.map((value, index) => ({
                    id: (0, ids_1.newId)(),
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
    }));
    router.use("/products", (0, router_helpers_1.buildCollectionRouter)({
        path: "/products",
        delegate: "productCard",
        createSchema: productCardSchema,
        updateSchema: productCardSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/partners", (0, router_helpers_1.buildCollectionRouter)({
        path: "/partners",
        delegate: "partner",
        createSchema: partnerSchema,
        updateSchema: partnerSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true,
        buildData: (input, request, mode) => ({
            name: input.name,
            logoSvg: (0, sanitize_1.sanitizeRequiredSvgMarkup)(input.logoSvg),
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
    }));
    router.use("/voice-scenarios", (0, router_helpers_1.buildCollectionRouter)({
        path: "/voice-scenarios",
        delegate: "voiceScenario",
        createSchema: voiceScenarioSchema,
        updateSchema: voiceScenarioSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/automation-engines", (0, router_helpers_1.buildCollectionRouter)({
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
                    id: (0, ids_1.newId)(),
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
    }));
    router.use("/capabilities", (0, router_helpers_1.buildCollectionRouter)({
        path: "/capabilities",
        delegate: "capabilityCard",
        createSchema: capabilityCardSchema,
        updateSchema: capabilityCardSchema,
        orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/roi-industries", (0, router_helpers_1.buildCollectionRouter)({
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
                    id: (0, ids_1.newId)(),
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
    }));
    router.use("/process-steps", (0, router_helpers_1.buildCollectionRouter)({
        path: "/process-steps",
        delegate: "processStep",
        createSchema: processStepSchema,
        updateSchema: processStepSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/product-features", (0, router_helpers_1.buildCollectionRouter)({
        path: "/product-features",
        delegate: "productFeature",
        createSchema: productFeatureSchema,
        updateSchema: productFeatureSchema,
        orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/callers", (0, router_helpers_1.buildCollectionRouter)({
        path: "/callers",
        delegate: "callerProfile",
        createSchema: callerProfileSchema,
        updateSchema: callerProfileSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/testimonials", (0, router_helpers_1.buildCollectionRouter)({
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
    }));
    router.use("/rating-summary", (0, router_helpers_1.buildSingletonRouter)({
        path: "/rating-summary",
        delegate: "ratingSummary",
        updateSchema: ratingSummarySchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles]
    }));
    router.use("/faq-categories", (0, router_helpers_1.buildCollectionRouter)({
        path: "/faq-categories",
        delegate: "faqCategory",
        createSchema: faqCategorySchema,
        updateSchema: faqCategorySchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles],
        supportsPublicationStatus: true
    }));
    router.use("/faqs", (0, router_helpers_1.buildCollectionRouter)({
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
        mapRecord: (record) => ({
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
    }));
    router.use("/integrations", (0, router_helpers_1.buildCollectionRouter)({
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
    }));
    router.use("/support-form-config", (0, router_helpers_1.buildSingletonRouter)({
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
            privacyPolicyText: (0, sanitize_1.sanitizeRequiredLimitedHtml)(input.privacyPolicyText),
            privacyPolicyUrl: input.privacyPolicyUrl,
            checkItems: {
                ...(mode === "update" ? { deleteMany: {} } : {}),
                create: input.checkItems.map((value, index) => ({
                    id: (0, ids_1.newId)(),
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
    }));
    router.use("/navigation-items", (0, router_helpers_1.buildCollectionRouter)({
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
    }));
    router.use("/mega-menu-items", (0, router_helpers_1.buildCollectionRouter)({
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
    }));
    router.use("/footer-link-groups", (0, router_helpers_1.buildCollectionRouter)({
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
                    id: (0, ids_1.newId)(),
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
    }));
    router.use("/section-config", (0, router_helpers_1.buildSingletonRouter)({
        path: "/section-config",
        delegate: "sectionConfig",
        updateSchema: sectionConfigSchema,
        readRoles: [...viewerRoles],
        writeRoles: [...contentWriterRoles]
    }));
    router.get("/section-states", (0, roles_1.requireRole)(...viewerRoles), async (_request, response) => {
        const states = await prisma_1.prisma.sectionState.findMany({
            orderBy: {
                sortOrder: "asc"
            }
        });
        response.json({
            data: states
        });
    });
    router.patch("/section-states/reorder", (0, roles_1.requireRole)(...contentWriterRoles), csrf_1.requireCsrf, async (request, response) => {
        const payload = (0, validation_1.parseWithSchema)(sectionStateReorderSchema, request.body);
        const auditFields = request.auth?.userId
            ? { updatedByUserId: request.auth.userId }
            : {};
        await prisma_1.prisma.$transaction(payload.map((item) => prisma_1.prisma.sectionState.update({
            where: {
                key: item.key
            },
            data: {
                sortOrder: item.sortOrder,
                ...auditFields
            }
        })));
        public_cache_1.publicContentCache.invalidatePrefix("public:");
        await (0, activity_log_1.recordActivity)({
            request,
            action: "reorder",
            resourceType: "section-states",
            summary: "Reordered landing page sections",
            metadata: {
                count: payload.length
            }
        });
        response.json({ success: true });
    });
    router.patch("/section-states/:key", (0, roles_1.requireRole)(...contentWriterRoles), csrf_1.requireCsrf, async (request, response) => {
        const key = (0, validation_1.parseWithSchema)(zod_1.z.nativeEnum(client_1.SectionKey), request.params.key);
        const input = (0, validation_1.parseWithSchema)(sectionStateUpdateSchema, request.body);
        const data = {};
        if (input.isVisible !== undefined) {
            data.isVisible = input.isVisible;
        }
        if (input.sortOrder !== undefined) {
            data.sortOrder = input.sortOrder;
        }
        if (request.auth?.userId) {
            data.updatedByUserId = request.auth.userId;
        }
        const state = await prisma_1.prisma.sectionState.update({
            where: {
                key
            },
            data
        });
        public_cache_1.publicContentCache.invalidatePrefix("public:");
        const action = input.isVisible !== undefined && input.sortOrder === undefined
            ? "toggle_visibility"
            : "update";
        await (0, activity_log_1.recordActivity)({
            request,
            action,
            resourceType: "section-states",
            resourceId: state.key,
            resourceLabel: state.key,
            summary: action === "toggle_visibility"
                ? input.isVisible
                    ? `Enabled section visibility: ${state.key}`
                    : `Disabled section visibility: ${state.key}`
                : (0, activity_log_1.buildActivitySummary)("update", "section-states", state.key),
            metadata: {
                isVisible: input.isVisible,
                sortOrder: input.sortOrder
            }
        });
        response.json({ data: state });
    });
    return router;
}
