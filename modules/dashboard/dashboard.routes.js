"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDashboardRouter = createDashboardRouter;
const express_1 = require("express");
const section_keys_1 = require("../../constants/section-keys");
const activity_log_1 = require("../../lib/activity-log");
const prisma_1 = require("../../lib/prisma");
const roles_1 = require("../../middleware/roles");
const defaultQuickActions = [
    { label: "Edit Hero", href: "/admin/hero" },
    { label: "Manage Products", href: "/admin/products" },
    { label: "Manage FAQs", href: "/admin/faqs" },
    { label: "Review Leads", href: "/admin/leads" }
];
const frontendEndpoints = [
    {
        key: "home",
        label: "Landing page payload",
        method: "GET",
        path: "/api/content/home",
        auth: "public",
        description: "Aggregated landing-page content, section visibility, and ordered section datasets."
    },
    {
        key: "navigation",
        label: "Header and navigation",
        method: "GET",
        path: "/api/content/navigation",
        auth: "public",
        description: "Header visibility, site settings, navigation items, and mega-menu columns."
    },
    {
        key: "footer",
        label: "Footer payload",
        method: "GET",
        path: "/api/content/footer",
        auth: "public",
        description: "Footer visibility, brand copy, footer tagline, and grouped footer links."
    },
    {
        key: "leads",
        label: "Lead capture",
        method: "POST",
        path: "/api/content/leads",
        auth: "public",
        description: "Submit public support-form or book-a-call leads and receive a success payload."
    },
    {
        key: "chat",
        label: "Website chat",
        method: "POST",
        path: "/api/content/chat",
        auth: "public",
        description: "Send a prompt or message array to the public website assistant if chat is configured."
    },
    {
        key: "openapi",
        label: "OpenAPI document",
        method: "GET",
        path: "/openapi.json",
        auth: "public",
        description: "Machine-readable API contract for frontend integration and client generation."
    },
    {
        key: "preview-session",
        label: "Preview session",
        method: "GET",
        path: "/api/admin/preview/session",
        auth: "admin-session",
        description: "Create a short-lived preview token so a frontend can request hidden and draft landing-page content safely."
    }
];
function getSectionVisibility(sectionStates, key) {
    return sectionStates.find((state) => state.key === key)?.isVisible === false
        ? "hidden"
        : "visible";
}
function buildQuickActions(counts) {
    const quickActions = [];
    if (counts.heroExists === 0) {
        quickActions.push({ label: "Complete Hero", href: "/admin/hero" });
    }
    if (counts.siteSettingsExists === 0) {
        quickActions.push({
            label: "Configure Site Settings",
            href: "/admin/settings"
        });
    }
    if (counts.sectionConfigExists === 0) {
        quickActions.push({
            label: "Set Section Copy",
            href: "/admin/sections"
        });
    }
    if (counts.products === 0) {
        quickActions.push({ label: "Add Products", href: "/admin/products" });
    }
    if (counts.voiceScenarios === 0) {
        quickActions.push({
            label: "Add Voice Scenarios",
            href: "/admin/voice-scenarios"
        });
    }
    if (counts.automationEngines === 0) {
        quickActions.push({
            label: "Add Automation Engines",
            href: "/admin/automation-engines"
        });
    }
    if (counts.processSteps === 0) {
        quickActions.push({
            label: "Add Process Steps",
            href: "/admin/process-steps"
        });
    }
    if (counts.productFeatures === 0) {
        quickActions.push({
            label: "Add Product Features",
            href: "/admin/product-features"
        });
    }
    if (counts.callers === 0) {
        quickActions.push({
            label: "Add Caller Profiles",
            href: "/admin/callers"
        });
    }
    if (counts.faqCategories === 0 || counts.faqs === 0) {
        quickActions.push({ label: "Build FAQs", href: "/admin/faqs" });
    }
    if (counts.integrations === 0) {
        quickActions.push({
            label: "Add Integrations",
            href: "/admin/integrations"
        });
    }
    if (counts.supportFormConfigExists === 0) {
        quickActions.push({
            label: "Configure Lead Form",
            href: "/admin/lead-form"
        });
    }
    if (quickActions.length > 0) {
        return quickActions.slice(0, 4);
    }
    return defaultQuickActions;
}
function buildSectionManagers(inventory, sectionStates) {
    const sectionManagerTemplates = {
        PRODUCT_SHOWCASE_OVERVIEW: {
            label: "Product Showcase Overview",
            description: "Top headline, CTA, and prompt templates.",
            href: "/admin/hero",
            area: "landing",
            itemCount: inventory.heroExists,
            sortOrder: null
        },
        HERO_SECTION: {
            label: "Hero Section",
            description: "Hero tabs, main visual, and dashboard imagery.",
            href: "/admin/hero",
            area: "landing",
            itemCount: inventory.heroExists,
            sortOrder: null
        },
        PRODUCT_SHOWCASE_SECTION: {
            label: "Product Showcase Section",
            description: "Product cards and their gradients.",
            href: "/admin/products",
            area: "landing",
            itemCount: inventory.products,
            sortOrder: null
        },
        PARTNERSHIP_SECTION: {
            label: "Partnership Section",
            description: "Trusted-by logo marquee entries.",
            href: "/admin/partners",
            area: "landing",
            itemCount: inventory.partners,
            sortOrder: null
        },
        VOICE_AGENTS_SECTION: {
            label: "Voice Agents Section",
            description: "Scenario cards, scripts, and preview audio.",
            href: "/admin/voice-scenarios",
            area: "landing",
            itemCount: inventory.voiceScenarios,
            sortOrder: null
        },
        AUTOMATION_ENGINES_SECTION: {
            label: "Automation Engines Section",
            description: "Engine blocks, bullets, imagery, and CTA styling.",
            href: "/admin/automation-engines",
            area: "landing",
            itemCount: inventory.automationEngines,
            sortOrder: null
        },
        MODEL_CREATION_GRID_SECTION: {
            label: "Model Creation Grid Section",
            description: "Capability cards arranged across the grid columns.",
            href: "/admin/capabilities",
            area: "landing",
            itemCount: inventory.capabilities,
            sortOrder: null
        },
        ROI_SNAPSHOT_SECTION: {
            label: "ROI Snapshot Section",
            description: "Industry stats, imagery, and audio assets.",
            href: "/admin/roi",
            area: "landing",
            itemCount: inventory.roiIndustries,
            sortOrder: null
        },
        PROCESS_STEPS_SECTION: {
            label: "Process Steps Section",
            description: "Ordered onboarding or delivery steps.",
            href: "/admin/process-steps",
            area: "landing",
            itemCount: inventory.processSteps,
            sortOrder: null
        },
        POWERFUL_PRODUCTS_OVERVIEW_SECTION: {
            label: "Powerful Products Overview Section",
            description: "Feature cards flanking the center product visual.",
            href: "/admin/product-features",
            area: "landing",
            itemCount: inventory.productFeatures,
            sortOrder: null
        },
        CALLER_SHOWCASE_SECTION: {
            label: "Caller Showcase Section",
            description: "Caller profiles, sample lines, and preview audio.",
            href: "/admin/callers",
            area: "landing",
            itemCount: inventory.callers,
            sortOrder: null
        },
        TESTIMONIALS_SECTION: {
            label: "Testimonials Section",
            description: "Testimonials plus the rating summary block.",
            href: "/admin/testimonials",
            area: "landing",
            itemCount: inventory.testimonials + inventory.ratingSummaryExists,
            sortOrder: null
        },
        FAQ_SECTION: {
            label: "FAQ Section",
            description: "FAQ categories and accordion items.",
            href: "/admin/faqs",
            area: "landing",
            itemCount: inventory.faqCategories + inventory.faqs,
            sortOrder: null
        },
        INTEGRATIONS_SECTION: {
            label: "Integrations Section",
            description: "Integration badges and marquee rows.",
            href: "/admin/integrations",
            area: "landing",
            itemCount: inventory.integrations,
            sortOrder: null
        },
        SUPPORT_LEAD_FORM_SECTION: {
            label: "Support Lead Form Section",
            description: "Lead-form content, checklist items, and success messaging.",
            href: "/admin/lead-form",
            area: "landing",
            itemCount: inventory.supportFormConfigExists,
            sortOrder: null
        },
        SITE_FOOTER_SECTION: {
            label: "Site Footer Section",
            description: "Footer groups, social links, and footer brand copy.",
            href: "/admin/footer",
            area: "landing",
            itemCount: inventory.footerLinkGroups,
            sortOrder: null
        },
        HEADER: {
            label: "Header and Navigation",
            description: "Header links, dropdowns, and mega-menu columns.",
            href: "/admin/navigation",
            area: "global",
            itemCount: inventory.navigationItems + inventory.megaMenuItems,
            sortOrder: null
        },
        CHAT: {
            label: "Site Settings and Chat",
            description: "Brand settings, social links, chat prompt, and model config.",
            href: "/admin/settings",
            area: "global",
            itemCount: inventory.siteSettingsExists,
            sortOrder: null
        }
    };
    const sectionStatesByKey = new Map(sectionStates.map((state) => [state.key, state]));
    const orderedSectionKeys = [
        ...sectionStates.map((state) => state.key),
        ...section_keys_1.SECTION_KEYS.filter((key) => !sectionStatesByKey.has(key))
    ];
    return [
        ...orderedSectionKeys.map((key, index) => ({
            key,
            ...sectionManagerTemplates[key],
            visibility: getSectionVisibility(sectionStates, key),
            sortOrder: sectionStatesByKey.get(key)?.sortOrder ?? index
        })),
        {
            key: "SECTION_CONFIG",
            label: "Section Copy and Visibility",
            description: "Shared headings, subheadings, ordering, and visibility.",
            href: "/admin/sections",
            area: "global",
            visibility: "system",
            itemCount: inventory.sectionConfigExists,
            sortOrder: null
        },
        {
            key: "MEDIA_LIBRARY",
            label: "Media Library",
            description: "Reusable images, audio, SVG, and document uploads.",
            href: "/admin/media",
            area: "global",
            visibility: "system",
            itemCount: inventory.mediaAssets,
            sortOrder: null
        }
    ];
}
function createDashboardRouter() {
    const router = (0, express_1.Router)();
    router.get("/overview", (0, roles_1.requireRole)("viewer", "editor", "admin", "superadmin"), async (request, response) => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const canReadActivity = request.auth?.role === "admin" || request.auth?.role === "superadmin";
        const [totalLeads, newLeads24h, sectionStates, recentLeads, products, partners, voiceScenarios, automationEngines, capabilities, roiIndustries, processSteps, productFeatures, callers, testimonials, faqCategories, faqs, integrations, navigationItems, megaMenuItems, footerLinkGroups, mediaAssets, heroExists, siteSettingsExists, sectionConfigExists, supportFormConfigExists, ratingSummaryExists, draftProducts, draftPartners, draftVoiceScenarios, draftAutomationEngines, draftCapabilities, draftRoiIndustries, draftProcessSteps, draftProductFeatures, draftCallers, draftTestimonials, draftFaqCategories, draftFaqs, draftIntegrations, draftNavigationItems, draftMegaMenuItems, draftFooterLinkGroups, recentActivity] = await Promise.all([
            prisma_1.prisma.leadSubmission.count(),
            prisma_1.prisma.leadSubmission.count({
                where: { submittedAt: { gte: dayAgo } }
            }),
            prisma_1.prisma.sectionState.findMany({ orderBy: { sortOrder: "asc" } }),
            prisma_1.prisma.leadSubmission.findMany({
                take: 10,
                orderBy: { submittedAt: "desc" }
            }),
            prisma_1.prisma.productCard.count(),
            prisma_1.prisma.partner.count(),
            prisma_1.prisma.voiceScenario.count(),
            prisma_1.prisma.automationEngine.count(),
            prisma_1.prisma.capabilityCard.count(),
            prisma_1.prisma.industryROI.count(),
            prisma_1.prisma.processStep.count(),
            prisma_1.prisma.productFeature.count(),
            prisma_1.prisma.callerProfile.count(),
            prisma_1.prisma.testimonial.count(),
            prisma_1.prisma.faqCategory.count(),
            prisma_1.prisma.faqItem.count(),
            prisma_1.prisma.integration.count(),
            prisma_1.prisma.navigationItem.count(),
            prisma_1.prisma.megaMenuItem.count(),
            prisma_1.prisma.footerLinkGroup.count(),
            prisma_1.prisma.mediaAsset.count(),
            prisma_1.prisma.heroContent.count(),
            prisma_1.prisma.siteSettings.count(),
            prisma_1.prisma.sectionConfig.count(),
            prisma_1.prisma.supportFormConfig.count(),
            prisma_1.prisma.ratingSummary.count(),
            prisma_1.prisma.productCard.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.partner.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.voiceScenario.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.automationEngine.count({
                where: { publicationStatus: "draft" }
            }),
            prisma_1.prisma.capabilityCard.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.industryROI.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.processStep.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.productFeature.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.callerProfile.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.testimonial.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.faqCategory.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.faqItem.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.integration.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.navigationItem.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.megaMenuItem.count({ where: { publicationStatus: "draft" } }),
            prisma_1.prisma.footerLinkGroup.count({
                where: { publicationStatus: "draft" }
            }),
            canReadActivity ? (0, activity_log_1.listActivityLog)({ limit: 6 }) : Promise.resolve([])
        ]);
        const totalSectionsActive = sectionStates.filter((state) => state.isVisible).length;
        const hiddenSections = sectionStates.length - totalSectionsActive;
        const contentItems = products +
            partners +
            voiceScenarios +
            automationEngines +
            capabilities +
            roiIndustries +
            processSteps +
            productFeatures +
            callers +
            testimonials +
            faqCategories +
            faqs +
            integrations +
            navigationItems +
            megaMenuItems +
            footerLinkGroups +
            mediaAssets +
            heroExists +
            siteSettingsExists +
            sectionConfigExists +
            supportFormConfigExists +
            ratingSummaryExists;
        const draftItems = Object.values({
            products: draftProducts,
            partners: draftPartners,
            voiceScenarios: draftVoiceScenarios,
            automationEngines: draftAutomationEngines,
            capabilities: draftCapabilities,
            roiIndustries: draftRoiIndustries,
            processSteps: draftProcessSteps,
            productFeatures: draftProductFeatures,
            callers: draftCallers,
            testimonials: draftTestimonials,
            faqCategories: draftFaqCategories,
            faqs: draftFaqs,
            integrations: draftIntegrations,
            navigationItems: draftNavigationItems,
            megaMenuItems: draftMegaMenuItems,
            footerLinkGroups: draftFooterLinkGroups
        }).reduce((total, count) => total + count, 0);
        const quickActions = buildQuickActions({
            heroExists,
            siteSettingsExists,
            sectionConfigExists,
            supportFormConfigExists,
            products,
            voiceScenarios,
            automationEngines,
            processSteps,
            productFeatures,
            callers,
            faqCategories,
            faqs,
            integrations
        });
        const sectionManagers = buildSectionManagers({
            heroExists,
            siteSettingsExists,
            sectionConfigExists,
            supportFormConfigExists,
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
            faqs,
            integrations,
            navigationItems,
            megaMenuItems,
            footerLinkGroups,
            ratingSummaryExists,
            mediaAssets
        }, sectionStates);
        response.json({
            data: {
                totalLeads,
                newLeads24h,
                totalSectionsActive,
                hiddenSections,
                contentItems,
                draftItems,
                recentLeads,
                recentActivity,
                sectionManagers,
                quickActions,
                frontendEndpoints
            }
        });
    });
    return router;
}
