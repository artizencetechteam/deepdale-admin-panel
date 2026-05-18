"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPublicChatRateLimits = resetPublicChatRateLimits;
exports.createPublicContentRouter = createPublicContentRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const public_cache_1 = require("../../lib/public-cache");
const mappers_1 = require("../../lib/mappers");
const validation_1 = require("../../lib/validation");
const ids_1 = require("../../lib/ids");
const errors_1 = require("../../lib/errors");
const openai_1 = require("../../lib/openai");
const env_1 = require("../../config/env");
const object_1 = require("../../lib/object");
const preview_1 = require("../../lib/preview");
const leadSubmissionSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(1).max(120),
    companyName: zod_1.z.string().trim().min(1).max(120),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().trim().max(40).optional(),
    source: zod_1.z.enum(["support-form", "book-a-call"])
});
const chatMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(["user", "assistant"]),
    content: zod_1.z.string().trim().min(1).max(4000)
});
const chatRequestSchema = zod_1.z.object({
    prompt: zod_1.z.string().trim().min(1).max(4000).optional(),
    messages: zod_1.z.array(chatMessageSchema).max(20).optional()
});
const chatRateLimitMap = new Map();
function resetPublicChatRateLimits() {
    chatRateLimitMap.clear();
}
function getRequestIp(request) {
    const forwarded = request.header("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return request.ip || "unknown";
}
function checkChatRateLimit(ipAddress) {
    const windowMs = 5 * 60 * 1000;
    const maxRequests = 15;
    const now = Date.now();
    const recent = (chatRateLimitMap.get(ipAddress) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= maxRequests) {
        throw new errors_1.AppError(429, "chat_rate_limited", "Too many chat requests");
    }
    recent.push(now);
    chatRateLimitMap.set(ipAddress, recent);
}
function isVisible(states, key) {
    return states.find((state) => state.key === key)?.isVisible ?? true;
}
function getPreviewContext(request) {
    const token = request.query.previewToken;
    if (token === undefined) {
        return null;
    }
    if (Array.isArray(token) || typeof token !== "string" || token.trim().length === 0) {
        throw new errors_1.AppError(400, "preview_token_invalid", "A valid preview token is required");
    }
    const preview = (0, preview_1.verifyPreviewToken)(token.trim());
    if (!preview) {
        throw new errors_1.AppError(403, "preview_token_invalid", "Preview token is invalid or expired");
    }
    return preview;
}
function shouldExposeSection(preview, states, key) {
    return Boolean(preview) || isVisible(states, key);
}
function stripPublicationStatus(record) {
    const { publicationStatus: _publicationStatus, ...rest } = record;
    return rest;
}
function normalizePreviewRecord(record, preview) {
    if (!preview || !("isActive" in record)) {
        return record;
    }
    return {
        ...record,
        isActive: true
    };
}
function serializeSectionStatesForResponse(sectionStates, preview) {
    if (!preview) {
        return sectionStates;
    }
    return sectionStates.map((state) => ({
        ...state,
        isVisible: true
    }));
}
function buildPreviewMetadata(preview) {
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
function createPublicContentRouter() {
    const router = (0, express_1.Router)();
    router.get("/home", async (request, response) => {
        const preview = getPreviewContext(request);
        const cacheKey = "public:home";
        const cached = preview ? null : public_cache_1.publicContentCache.get(cacheKey);
        if (cached) {
            response.json(cached);
            return;
        }
        if (preview) {
            response.set("Cache-Control", "no-store");
        }
        const [siteSettings, heroContent, sectionConfig, ratingSummary, sectionStates, products, partners, voiceScenarios, automationEngines, capabilities, roiIndustries, processSteps, productFeatures, callers, testimonials, faqCategories, faqItems, integrations, supportFormConfig] = await Promise.all([
            prisma_1.prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
            prisma_1.prisma.heroContent.findUniqueOrThrow({
                where: { id: 1 },
                include: { heroTabs: true, promptTemplates: true }
            }),
            prisma_1.prisma.sectionConfig.findUniqueOrThrow({ where: { id: 1 } }),
            prisma_1.prisma.ratingSummary.findUniqueOrThrow({ where: { id: 1 } }),
            prisma_1.prisma.sectionState.findMany({ orderBy: { sortOrder: "asc" } }),
            prisma_1.prisma.productCard.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.partner.findMany({
                ...(preview
                    ? {}
                    : { where: { isActive: true, publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.voiceScenario.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.automationEngine.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                include: { bulletPoints: true },
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.capabilityCard.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
            }),
            prisma_1.prisma.industryROI.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                include: { useCases: true },
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.processStep.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.productFeature.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
            }),
            prisma_1.prisma.callerProfile.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.testimonial.findMany({
                ...(preview
                    ? {}
                    : { where: { isActive: true, publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.faqCategory.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.faqItem.findMany({
                ...(preview
                    ? {}
                    : { where: { isActive: true, publicationStatus: "published" } }),
                include: { category: true },
                orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }]
            }),
            prisma_1.prisma.integration.findMany({
                ...(preview
                    ? {}
                    : { where: { isActive: true, publicationStatus: "published" } }),
                orderBy: [{ row: "asc" }, { sortOrder: "asc" }]
            }),
            prisma_1.prisma.supportFormConfig.findUniqueOrThrow({
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
                siteSettings: (0, mappers_1.serializePublicSiteSettings)(siteSettings),
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
                            .map((item) => item.label),
                        heroHeading: heroContent.heroHeading,
                        heroBackgroundImage: heroContent.heroBackgroundImage,
                        heroDashboardImage: heroContent.heroDashboardImage
                    }
                }),
                ...(shouldExposeSection(preview, sectionStates, "PRODUCT_SHOWCASE_SECTION") && {
                    products: products.map(stripPublicationStatus)
                }),
                ...(shouldExposeSection(preview, sectionStates, "PARTNERSHIP_SECTION") && {
                    partners: partners.map((partner) => stripPublicationStatus(normalizePreviewRecord(partner, preview)))
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
                    testimonials: testimonials.map((testimonial) => stripPublicationStatus(normalizePreviewRecord(testimonial, preview)))
                }),
                ...(shouldExposeSection(preview, sectionStates, "FAQ_SECTION") && {
                    faq: faqData.map((category) => ({
                        ...category,
                        items: category.items.map((item) => normalizePreviewRecord(item, preview))
                    }))
                }),
                ...(shouldExposeSection(preview, sectionStates, "INTEGRATIONS_SECTION") && {
                    integrations: integrations.map((integration) => stripPublicationStatus(normalizePreviewRecord(integration, preview)))
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
            public_cache_1.publicContentCache.set(cacheKey, payload);
        }
        response.json(payload);
    });
    router.get("/navigation", async (request, response) => {
        const preview = getPreviewContext(request);
        const cacheKey = "public:navigation";
        const cached = preview ? null : public_cache_1.publicContentCache.get(cacheKey);
        if (cached) {
            response.json(cached);
            return;
        }
        if (preview) {
            response.set("Cache-Control", "no-store");
        }
        const [siteSettings, sectionStates, navigationItems, megaMenuItems] = await Promise.all([
            prisma_1.prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
            prisma_1.prisma.sectionState.findMany(),
            prisma_1.prisma.navigationItem.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: { sortOrder: "asc" }
            }),
            prisma_1.prisma.megaMenuItem.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                orderBy: [{ column: "asc" }, { sortOrder: "asc" }]
            })
        ]);
        const payload = {
            data: {
                ...buildPreviewMetadata(preview),
                isVisible: shouldExposeSection(preview, sectionStates, "HEADER"),
                siteSettings: (0, mappers_1.serializePublicSiteSettings)(siteSettings),
                navigationItems: navigationItems.map((item) => stripPublicationStatus(normalizePreviewRecord(item, preview))),
                megaMenu: {
                    platforms: megaMenuItems
                        .filter((item) => item.column === "platforms")
                        .map((item) => stripPublicationStatus(normalizePreviewRecord(item, preview))),
                    useCases: megaMenuItems
                        .filter((item) => item.column === "useCases")
                        .map((item) => stripPublicationStatus(normalizePreviewRecord(item, preview))),
                    customers: megaMenuItems
                        .filter((item) => item.column === "customers")
                        .map((item) => stripPublicationStatus(normalizePreviewRecord(item, preview)))
                }
            }
        };
        if (!preview) {
            public_cache_1.publicContentCache.set(cacheKey, payload);
        }
        response.json(payload);
    });
    router.get("/footer", async (request, response) => {
        const preview = getPreviewContext(request);
        const cacheKey = "public:footer";
        const cached = preview ? null : public_cache_1.publicContentCache.get(cacheKey);
        if (cached) {
            response.json(cached);
            return;
        }
        if (preview) {
            response.set("Cache-Control", "no-store");
        }
        const [siteSettings, sectionConfig, sectionStates, footerLinkGroups] = await Promise.all([
            prisma_1.prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
            prisma_1.prisma.sectionConfig.findUniqueOrThrow({ where: { id: 1 } }),
            prisma_1.prisma.sectionState.findMany(),
            prisma_1.prisma.footerLinkGroup.findMany({
                ...(preview ? {} : { where: { publicationStatus: "published" } }),
                include: { links: true },
                orderBy: { sortOrder: "asc" }
            })
        ]);
        const payload = {
            data: {
                ...buildPreviewMetadata(preview),
                isVisible: shouldExposeSection(preview, sectionStates, "SITE_FOOTER_SECTION"),
                siteSettings: (0, mappers_1.serializePublicSiteSettings)(siteSettings),
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
            public_cache_1.publicContentCache.set(cacheKey, payload);
        }
        response.json(payload);
    });
    router.post("/leads", async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(leadSubmissionSchema, request.body);
        const lead = await prisma_1.prisma.leadSubmission.create({
            data: {
                id: (0, ids_1.newId)(),
                fullName: input.fullName,
                companyName: input.companyName,
                email: input.email.toLowerCase().trim(),
                ...(0, object_1.compactObject)({
                    phone: input.phone ?? null
                }),
                source: (0, mappers_1.leadSourceFromApi)(input.source),
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
        const input = (0, validation_1.parseWithSchema)(chatRequestSchema, request.body);
        const ipAddress = getRequestIp(request);
        checkChatRateLimit(ipAddress);
        const siteSettings = await prisma_1.prisma.siteSettings.findUniqueOrThrow({
            where: { id: 1 }
        });
        const client = (0, openai_1.getOpenAiClient)();
        if (!client || !env_1.env.OPENAI_API_KEY) {
            throw new errors_1.AppError(503, "chat_not_configured", "Chat provider is not configured");
        }
        const messages = input.messages?.length
            ? input.messages
            : input.prompt
                ? [{ role: "user", content: input.prompt }]
                : [];
        if (messages.length === 0) {
            throw new errors_1.AppError(400, "chat_empty", "A prompt or messages array is required");
        }
        const result = await client.chat.completions.create({
            model: siteSettings.chatModel || env_1.env.OPENAI_CHAT_MODEL_DEFAULT,
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
