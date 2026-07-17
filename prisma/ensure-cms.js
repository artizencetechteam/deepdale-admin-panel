"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../src/config/env");
const section_keys_1 = require("../src/constants/section-keys");
const ids_1 = require("../src/lib/ids");
const prisma_1 = require("../src/lib/prisma");
function svgDataUri(label, options) {
    const width = options?.width ?? 1200;
    const height = options?.height ?? 800;
    const background = options?.background ?? "#101828";
    const foreground = options?.foreground ?? "#f8fafc";
    const accent = options?.accent ?? "#38bdf8";
    const fontSize = Math.max(24, Math.round(width / 18));
    const safeLabel = label
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${background}" rx="32"/>
  <circle cx="${Math.round(width * 0.15)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.08)}" fill="${accent}" opacity="0.18"/>
  <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.72)}" r="${Math.round(width * 0.1)}" fill="${accent}" opacity="0.12"/>
  <text x="50%" y="48%" fill="${foreground}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle">${safeLabel}</text>
  <text x="50%" y="58%" fill="${accent}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(fontSize * 0.42)}" text-anchor="middle">Deepdale CMS placeholder</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function imageAsset(label, accent) {
    return svgDataUri(label, { accent });
}
function logoAsset(label) {
    return "/logo.png";
}
async function ensureSiteSettings() {
    await prisma_1.prisma.siteSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            siteName: "Deepdale",
            logoUrl: "/logo.png",
            contactEmail: "contact@deepdale.ai",
            copyrightText: "Copyright 2026 Deepdale. All rights reserved.",
            chatSystemPrompt: "You are Deepdale AI. Answer as a concise sales assistant for Deepdale products and qualify inbound leads.",
            chatModel: env_1.env.OPENAI_CHAT_MODEL_DEFAULT,
            socialFacebook: "https://facebook.com/deepdale",
            socialLinkedin: "https://linkedin.com/company/deepdale",
            socialYoutube: "https://youtube.com/@deepdale",
            socialTwitter: "https://x.com/deepdale"
        }
    });
}
async function ensureHeroContent() {
    await prisma_1.prisma.heroContent.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            headline: "AI smart automation built to scale your business",
            subheadline: "Eliminate busywork, accelerate response times, and convert more conversations into revenue.",
            ctaText: "Book a Call",
            ctaLink: "/book-a-call",
            heroHeading: "Control every customer interaction from one dashboard",
            heroBackgroundImage: "herobg.png",
            heroDashboardImage: "voiceagent.png"
        }
    });
    const [heroTabCount, promptTemplateCount] = await Promise.all([
        prisma_1.prisma.heroTab.count({ where: { heroContentId: 1 } }),
        prisma_1.prisma.heroPromptTemplate.count({ where: { heroContentId: 1 } })
    ]);
    if (heroTabCount === 0) {
        await prisma_1.prisma.heroTab.createMany({
            data: [
                {
                    id: (0, ids_1.newId)(),
                    heroContentId: 1,
                    label: "Chatzify",
                    image: "/aichatbot.png",
                    sortOrder: 0
                },
                {
                    id: (0, ids_1.newId)(),
                    heroContentId: 1,
                    label: "VoiceAgent",
                    image: "/voiceagent.png",
                    sortOrder: 1
                },
                {
                    id: (0, ids_1.newId)(),
                    heroContentId: 1,
                    label: "AI Automation",
                    image: "/aiautomation.png",
                    sortOrder: 2
                }
            ]
        });
    }
    if (promptTemplateCount === 0) {
        await prisma_1.prisma.heroPromptTemplate.createMany({
            data: [
                "Build a lead qualification assistant for my SaaS homepage",
                "Show me how Deepdale handles after-hours support",
                "Design a voice workflow for appointment booking"
            ].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                heroContentId: 1,
                value,
                sortOrder
            }))
        });
    }
}
async function ensureRatingSummary() {
    await prisma_1.prisma.ratingSummary.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            score: "4.9",
            reviewCount: "600+ Reviews",
            starCount: 5
        }
    });
}
async function ensureSupportFormConfig() {
    await prisma_1.prisma.supportFormConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            heading: "AI Agent for Customer Support",
            subheading: "Resolve repetitive tickets instantly and escalate complex issues with full context.",
            submitButtonText: "Book a Demo",
            successMessage: "Thank you. Your request has been received. A Deepdale specialist will reach out shortly.",
            privacyPolicyText: '<p>By submitting this form you agree to our <a href="https://deepdale.ai/privacy" target="_blank" rel="noreferrer">privacy policy</a>.</p>',
            privacyPolicyUrl: "https://deepdale.ai/privacy"
        }
    });
    const checkItemCount = await prisma_1.prisma.supportFormCheckItem.count({
        where: { supportFormConfigId: 1 }
    });
    if (checkItemCount === 0) {
        await prisma_1.prisma.supportFormCheckItem.createMany({
            data: [
                 "Seamless AI-to-human handoff via Live Chat",
        "AI Actions automate tasks and deliver immediate answers",
        "Dedicated customer success manager",
        "AI Boost™ enhances accuracy of your data sources",
        "Audience Creation with Custom Attributes"
            ].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                supportFormConfigId: 1,
                value,
                sortOrder
            }))
        });
    }
}
async function ensureSectionConfig() {
    await prisma_1.prisma.sectionConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            voiceAgentsHeading: "AI voice agents that work 24/7",
            voiceAgentsSubheading: "Handle calls, book appointments, and qualify leads without adding headcount.",
            voiceAgentsBodyText: "Deploy voice workflows tailored to your scripts, systems, and handoff rules.",
            automationHeading: "Three powerful automation engines.",
            automationSubheading: "Each product works independently, but the real lift comes when you combine them.",
            automationCtaBannerText: "Create a flawless customer experience",
            automationCtaBannerButton: "Book a Call",
            modelCreationLine1: "Create your own",
            modelCreationLine2: "Model",
            modelCreationLine3: "With AI",
            processStepsHeading: "AI & automation steps",
            processStepsSubheading: "Client satisfaction is our first priority.",
            productsOverviewHeading: "Powerful AI products built to automate your business",
            productsOverviewSubheading: "Combine chat, voice, and workflow orchestration across the customer journey.",
            productFeaturesCenterImageUrl: imageAsset("Product Features", "#8b5cf6"),
            callerShowcaseHeading: "C'mon, make that call!",
            callerShowcaseSubheading: "Try callers, meet Paul and Cassie",
            testimonialsHeading: "Real stories, real results from Deepdale customers",
            faqHeading: "Have questions?",
            integrationsHeading: "Integrate with the tools you already use",
            integrationsSubheading: "Connect your CRM, helpdesk, telephony stack, and analytics tools.",
            integrationsCtaText: "Find more about our integrations",
            partnershipHeading: "Trusted by companies of all sizes",
            roiBadgeText: "Industry Use Cases",
            roiHeading: "ROI snapshot by industry",
            footerTagline: "AI-powered automation platform helping businesses unify customer support, sales, and operations.",
            footerBrandText: "Deepdale"
        }
    });
}
async function ensureSectionStates() {
    const existingStates = await prisma_1.prisma.sectionState.findMany({
        select: {
            key: true,
            sortOrder: true
        }
    });
    const existingKeys = new Set(existingStates.map((state) => state.key));
    const missingKeys = section_keys_1.SECTION_KEYS.filter((key) => !existingKeys.has(key));
    if (missingKeys.length === 0) {
        return 0;
    }
    const nextSortOrder = existingStates.reduce((highest, state) => Math.max(highest, state.sortOrder), -1) + 1;
    await prisma_1.prisma.sectionState.createMany({
        data: missingKeys.map((key, index) => ({
            key,
            isVisible: true,
            sortOrder: nextSortOrder + index
        }))
    });
    return missingKeys.length;
}
async function main() {
    await ensureSiteSettings();
    await ensureHeroContent();
    await ensureRatingSummary();
    await ensureSupportFormConfig();
    await ensureSectionConfig();
    const createdSectionStates = await ensureSectionStates();
    console.log(`Ensured Deepdale CMS singletons and ${createdSectionStates} missing section state(s).`);
}
main()
    .then(async () => {
    await prisma_1.prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
