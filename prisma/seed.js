"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/lib/prisma");
const env_1 = require("../src/config/env");
const passwords_1 = require("../src/lib/passwords");
const ids_1 = require("../src/lib/ids");
const section_keys_1 = require("../src/constants/section-keys");
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
  <text x="50%" y="58%" fill="${accent}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(fontSize * 0.42)}" text-anchor="middle">Deepdale seed asset</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function imageAsset(label, accent) {
    return svgDataUri(label, { accent });
}
function avatarAsset(label, accent) {
    return svgDataUri(label, {
        width: 400,
        height: 400,
        accent,
        background: "#0b1220"
    });
}
function logoAsset(label) {
    return svgDataUri(label, {
        width: 320,
        height: 96,
        background: "#020617",
        accent: "#22d3ee"
    });
}
async function clearData() {
    await prisma_1.prisma.footerLink.deleteMany();
    await prisma_1.prisma.footerLinkGroup.deleteMany();
    await prisma_1.prisma.heroPromptTemplate.deleteMany();
    await prisma_1.prisma.heroTab.deleteMany();
    await prisma_1.prisma.automationEngineBullet.deleteMany();
    await prisma_1.prisma.industryROIUseCase.deleteMany();
    await prisma_1.prisma.supportFormCheckItem.deleteMany();
    await prisma_1.prisma.faqItem.deleteMany();
    await prisma_1.prisma.faqCategory.deleteMany();
    await prisma_1.prisma.integration.deleteMany();
    await prisma_1.prisma.navigationItem.deleteMany();
    await prisma_1.prisma.megaMenuItem.deleteMany();
    await prisma_1.prisma.processStep.deleteMany();
    await prisma_1.prisma.productFeature.deleteMany();
    await prisma_1.prisma.capabilityCard.deleteMany();
    await prisma_1.prisma.automationEngine.deleteMany();
    await prisma_1.prisma.voiceScenario.deleteMany();
    await prisma_1.prisma.productCard.deleteMany();
    await prisma_1.prisma.partner.deleteMany();
    await prisma_1.prisma.callerProfile.deleteMany();
    await prisma_1.prisma.testimonial.deleteMany();
    await prisma_1.prisma.industryROI.deleteMany();
    await prisma_1.prisma.leadSubmission.deleteMany();
    await prisma_1.prisma.mediaAsset.deleteMany();
    await prisma_1.prisma.sectionState.deleteMany();
    await prisma_1.prisma.supportFormConfig.deleteMany();
    await prisma_1.prisma.sectionConfig.deleteMany();
    await prisma_1.prisma.ratingSummary.deleteMany();
    await prisma_1.prisma.heroContent.deleteMany();
    await prisma_1.prisma.siteSettings.deleteMany();
    await prisma_1.prisma.session.deleteMany();
    await prisma_1.prisma.loginAttempt.deleteMany();
    await prisma_1.prisma.user.deleteMany();
}
async function seedUser() {
    await prisma_1.prisma.user.create({
        data: {
            id: (0, ids_1.newId)(),
            email: env_1.env.ADMIN_SEED_EMAIL.toLowerCase().trim(),
            name: "Deepdale Super Admin",
            role: "superadmin",
            isActive: true,
            passwordHash: await (0, passwords_1.hashPassword)(env_1.env.ADMIN_SEED_PASSWORD)
        }
    });
}
async function seedSingletons() {
    await prisma_1.prisma.siteSettings.create({
        data: {
            id: 1,
            siteName: "Deepdale",
            logoUrl: logoAsset("Deepdale"),
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
    await prisma_1.prisma.heroContent.create({
        data: {
            id: 1,
            headline: "AI smart automation built to scale your business",
            subheadline: "Eliminate busywork, accelerate response times, and convert more conversations into revenue.",
            ctaText: "Book a Call",
            ctaLink: "/book-a-call",
            heroHeading: "Control every customer interaction from one dashboard",
            heroBackgroundImage: imageAsset("Hero Background", "#38bdf8"),
            heroDashboardImage: imageAsset("Hero Dashboard", "#f59e0b")
        }
    });
    await prisma_1.prisma.heroTab.createMany({
        data: ["VoiceAgent", "AI Automation"].map((label, sortOrder) => ({
            id: (0, ids_1.newId)(),
            heroContentId: 1,
            label,
            sortOrder
        }))
    });
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
    await prisma_1.prisma.ratingSummary.create({
        data: {
            id: 1,
            score: "4.9",
            reviewCount: "600+ Reviews",
            starCount: 5
        }
    });
    await prisma_1.prisma.supportFormConfig.create({
        data: {
            id: 1,
            heading: "AI Agent for Customer Support",
            subheading: "Resolve repetitive tickets instantly and escalate complex issues with full context.",
            submitButtonText: "Book a Demo",
            successMessage: "Thank you. Your request has been received. A Deepdale specialist will reach out shortly.",
            privacyPolicyText: '<p>By submitting this form you agree to our <a href="https://deepdale.ai/privacy" target="_blank" rel="noreferrer">privacy policy</a>.</p>',
            privacyPolicyUrl: "https://deepdale.ai/privacy"
        }
    });
    await prisma_1.prisma.supportFormCheckItem.createMany({
        data: [
            "Seamless AI-to-human handoff",
            "Unified inbox and CRM enrichment",
            "24/7 omnichannel coverage"
        ].map((value, sortOrder) => ({
            id: (0, ids_1.newId)(),
            supportFormConfigId: 1,
            value,
            sortOrder
        }))
    });
    await prisma_1.prisma.sectionConfig.create({
        data: {
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
async function seedSectionStates() {
    await prisma_1.prisma.sectionState.createMany({
        data: section_keys_1.SECTION_KEYS.map((key, index) => ({
            key,
            isVisible: true,
            sortOrder: index
        }))
    });
}
async function seedCollections() {
    await prisma_1.prisma.productCard.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                brand: "Chatzify",
                image: imageAsset("Chatzify", "#2563eb"),
                title: "The chatbot platform that gets the job done",
                description: "Build human-like AI chatbots for sales, support, and qualification workflows.",
                gradientPreset: "ocean-blue",
                buttonGradientPreset: "gold-lift",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                brand: "VoiceAgent",
                image: imageAsset("VoiceAgent", "#10b981"),
                title: "Voice agents that answer, route, and convert",
                description: "Deploy AI voice agents to manage inbound calls and automate booking flows.",
                gradientPreset: "emerald-glow",
                buttonGradientPreset: "teal-circuit",
                sortOrder: 1
            }
        ]
    });
    await prisma_1.prisma.partner.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                name: "Nova Clinic",
                logoSvg: '<svg viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="32" rx="8" fill="#101828"/><text x="14" y="21" fill="#fff">Nova Clinic</text></svg>',
                sortOrder: 0,
                isActive: true
            },
            {
                id: (0, ids_1.newId)(),
                name: "Pulse Commerce",
                logoSvg: '<svg viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="32" rx="8" fill="#087a72"/><text x="14" y="21" fill="#fff">Pulse Commerce</text></svg>',
                sortOrder: 1,
                isActive: true
            }
        ]
    });
    await prisma_1.prisma.voiceScenario.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                tag: "Medical",
                title: "Dental clinic",
                description: "Listen to how our AI voice agent handles scheduling and urgent questions.",
                image: imageAsset("Dental Clinic", "#14b8a6"),
                script: "Hello, thanks for calling Nova Dental. I can help schedule, reschedule, or answer quick questions.",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                tag: "Sales",
                title: "Lead qualification",
                description: "Score inbound calls and route high-intent leads directly to reps.",
                image: imageAsset("Lead Qualification", "#f97316"),
                script: "Thanks for calling Deepdale. I can qualify your needs and book time with our team.",
                sortOrder: 1
            }
        ]
    });
    const automationOneId = (0, ids_1.newId)();
    const automationTwoId = (0, ids_1.newId)();
    const automationThreeId = (0, ids_1.newId)();
    await prisma_1.prisma.automationEngine.createMany({
        data: [
            {
                id: automationOneId,
                tag: "AI Chatbot",
                title: "Smart conversations that turn visitors into customers",
                ctaLabel: "Try AI Chatbot",
                ctaLink: "/chatzify",
                ctaGradientPreset: "ocean-blue",
                image: imageAsset("Chatbot Engine", "#2563eb"),
                imageAlt: "Chatbot automation",
                layoutDirection: "left",
                sortOrder: 0
            },
            {
                id: automationTwoId,
                tag: "Voice Agent",
                title: "Answer, qualify, and route calls automatically",
                ctaLabel: "Try Voice Agent",
                ctaLink: "/voiceagent",
                ctaGradientPreset: "emerald-glow",
                image: imageAsset("Voice Engine", "#059669"),
                imageAlt: "Voice agent automation",
                layoutDirection: "right",
                sortOrder: 1
            },
            {
                id: automationThreeId,
                tag: "AI Automation",
                title: "Coordinate customer workflows behind the scenes",
                ctaLabel: "Explore Automation",
                ctaLink: "/",
                ctaGradientPreset: "deep-ink",
                image: imageAsset("Automation Engine", "#7c3aed"),
                imageAlt: "Workflow automation",
                layoutDirection: "left",
                sortOrder: 2
            }
        ]
    });
    await prisma_1.prisma.automationEngineBullet.createMany({
        data: [
            [
                "Engages website visitors instantly",
                "Qualifies leads before handoff",
                "Syncs data to your CRM"
            ].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                automationEngineId: automationOneId,
                value,
                sortOrder
            })),
            [
                "Answers around the clock",
                "Captures intent and urgency",
                "Books appointments automatically"
            ].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                automationEngineId: automationTwoId,
                value,
                sortOrder
            })),
            [
                "Triggers internal workflows",
                "Updates records across tools",
                "Escalates exceptions with context"
            ].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                automationEngineId: automationThreeId,
                value,
                sortOrder
            }))
        ].flat()
    });
    await prisma_1.prisma.capabilityCard.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                title: "Data analytics",
                description: "Instant insight into conversation performance and pipeline impact.",
                iconName: "BarChart3",
                column: "left",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                title: "Workflow routing",
                description: "Trigger automations across CRM, support, and telephony systems.",
                iconName: "Workflow",
                column: "middle",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                title: "Team handoff",
                description: "Escalate to humans with full context when an interaction needs it.",
                iconName: "Headset",
                column: "right",
                sortOrder: 0
            }
        ]
    });
    const roiCarId = (0, ids_1.newId)();
    const roiClinicId = (0, ids_1.newId)();
    await prisma_1.prisma.industryROI.createMany({
        data: [
            {
                id: roiCarId,
                label: "Automotive",
                image: imageAsset("Automotive ROI", "#f59e0b"),
                cvr: "400%",
                secondaryMetric: "25-35%",
                audioLabel: "Hear it in action",
                audioDuration: "01:53",
                audioFile: null,
                sortOrder: 0
            },
            {
                id: roiClinicId,
                label: "Healthcare",
                image: imageAsset("Healthcare ROI", "#0891b2"),
                cvr: "280%",
                secondaryMetric: "18-22%",
                audioLabel: "Hear it in action",
                audioDuration: "01:21",
                audioFile: null,
                sortOrder: 1
            }
        ]
    });
    await prisma_1.prisma.industryROIUseCase.createMany({
        data: [
            ["Lead Qualification", "Appointment Confirmation", "Support"].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                industryRoiId: roiCarId,
                value,
                sortOrder
            })),
            ["Appointment Booking", "Prescription Refill", "Patient FAQ"].map((value, sortOrder) => ({
                id: (0, ids_1.newId)(),
                industryRoiId: roiClinicId,
                value,
                sortOrder
            }))
        ].flat()
    });
    await prisma_1.prisma.processStep.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                label: "01",
                title: "Strategic planning & solution mapping",
                description: "We capture goals, workflows, compliance needs, and customer intent paths.",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                label: "02",
                title: "Configuration and knowledge design",
                description: "We build the assistant, voice prompts, and routing logic around your business.",
                sortOrder: 1
            },
            {
                id: (0, ids_1.newId)(),
                label: "03",
                title: "Launch and observe",
                description: "We roll out carefully, monitor interactions, and tighten weak spots quickly.",
                sortOrder: 2
            },
            {
                id: (0, ids_1.newId)(),
                label: "04",
                title: "Optimize for conversion",
                description: "We refine prompts, automation triggers, and escalation flows against outcomes.",
                sortOrder: 3
            }
        ]
    });
    await prisma_1.prisma.productFeature.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                title: "AI Chatbot",
                subtitle: "Smart customer conversations",
                description: "Engage website visitors instantly and route them to the right path.",
                iconName: "Bot",
                column: "left",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                title: "Voice Agent",
                subtitle: "Automated inbound call handling",
                description: "Book appointments, answer FAQs, and qualify leads over the phone.",
                iconName: "PhoneCall",
                column: "right",
                sortOrder: 0
            }
        ]
    });
    await prisma_1.prisma.callerProfile.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                name: "Cassie",
                role: "Female AI Agent",
                image: avatarAsset("Cassie", "#ec4899"),
                sampleLine: "Hi, this is Cassie from Deepdale. I can help schedule a product walkthrough.",
                voicePitch: 1.08,
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                name: "Paul",
                role: "Male AI Agent",
                image: avatarAsset("Paul", "#3b82f6"),
                sampleLine: "Hello, I'm Paul. I can answer questions and connect you with the right specialist.",
                voicePitch: 0.94,
                sortOrder: 1
            }
        ]
    });
    await prisma_1.prisma.testimonial.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                quote: "Our support costs dropped 60% in eight weeks and response time improved immediately.",
                author: "Parvej Ahmed",
                title: "Creative Director",
                avatar: avatarAsset("Parvej", "#8b5cf6"),
                rating: 5,
                sortOrder: 0,
                isActive: true
            },
            {
                id: (0, ids_1.newId)(),
                quote: "Deepdale turned our after-hours lead capture into a consistent revenue source.",
                author: "Nadia Rahman",
                title: "Growth Lead",
                avatar: avatarAsset("Nadia", "#14b8a6"),
                rating: 5,
                sortOrder: 1,
                isActive: true
            }
        ]
    });
    const faqCategoryVoice = (0, ids_1.newId)();
    const faqCategoryAutomation = (0, ids_1.newId)();
    await prisma_1.prisma.faqCategory.createMany({
        data: [
            {
                id: faqCategoryVoice,
                label: "AI Voice Agent",
                sortOrder: 0
            },
            {
                id: faqCategoryAutomation,
                label: "AI Automation",
                sortOrder: 1
            }
        ]
    });
    await prisma_1.prisma.faqItem.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                categoryId: faqCategoryVoice,
                question: "Can the voice agent book appointments?",
                answer: "Yes. It can qualify, schedule, reschedule, and escalate based on your workflow rules.",
                sortOrder: 0,
                isActive: true
            },
            {
                id: (0, ids_1.newId)(),
                categoryId: faqCategoryAutomation,
                question: "Do automations sync with our CRM?",
                answer: "Yes. Deepdale can push structured outcomes into CRM and helpdesk systems.",
                sortOrder: 0,
                isActive: true
            }
        ]
    });
    await prisma_1.prisma.integration.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                name: "Intercom",
                shortLabel: "I",
                color: "#0A054D",
                logoUrl: logoAsset("Intercom"),
                row: 1,
                sortOrder: 0,
                isActive: true
            },
            {
                id: (0, ids_1.newId)(),
                name: "HubSpot",
                shortLabel: "H",
                color: "#FF7A59",
                logoUrl: logoAsset("HubSpot"),
                row: 2,
                sortOrder: 0,
                isActive: true
            },
            {
                id: (0, ids_1.newId)(),
                name: "Salesforce",
                shortLabel: "S",
                color: "#00A1E0",
                logoUrl: logoAsset("Salesforce"),
                row: 3,
                sortOrder: 0,
                isActive: true
            }
        ]
    });
    await prisma_1.prisma.navigationItem.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                label: "Platform",
                href: null,
                hasDropdown: true,
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                label: "Use Cases",
                href: null,
                hasDropdown: true,
                sortOrder: 1
            },
            {
                id: (0, ids_1.newId)(),
                label: "Pricing",
                href: "/pricing",
                hasDropdown: false,
                sortOrder: 2
            }
        ]
    });
    await prisma_1.prisma.megaMenuItem.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
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
                id: (0, ids_1.newId)(),
                column: "useCases",
                title: "Lead qualification",
                description: "Score and route high-intent prospects.",
                iconName: "Gauge",
                iconColor: "#F79009",
                isNew: false,
                link: "/use-cases/lead-qualification",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                column: "customers",
                title: "Healthcare",
                description: "Automate scheduling and intake for clinics.",
                iconName: "Stethoscope",
                iconColor: "#087A72",
                isNew: false,
                link: "/customers/healthcare",
                sortOrder: 0
            }
        ]
    });
    const footerProductId = (0, ids_1.newId)();
    const footerCompanyId = (0, ids_1.newId)();
    const footerResourcesId = (0, ids_1.newId)();
    await prisma_1.prisma.footerLinkGroup.createMany({
        data: [
            {
                id: footerProductId,
                heading: "Product",
                sortOrder: 0
            },
            {
                id: footerCompanyId,
                heading: "Company",
                sortOrder: 1
            },
            {
                id: footerResourcesId,
                heading: "Resources",
                sortOrder: 2
            }
        ]
    });
    await prisma_1.prisma.footerLink.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                footerLinkGroupId: footerProductId,
                label: "Chatzify",
                href: "/chatzify",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                footerLinkGroupId: footerProductId,
                label: "VoiceAgent",
                href: "/voiceagent",
                sortOrder: 1
            },
            {
                id: (0, ids_1.newId)(),
                footerLinkGroupId: footerCompanyId,
                label: "About",
                href: "/about",
                sortOrder: 0
            },
            {
                id: (0, ids_1.newId)(),
                footerLinkGroupId: footerResourcesId,
                label: "Blog",
                href: "/blog",
                sortOrder: 0
            }
        ]
    });
    await prisma_1.prisma.leadSubmission.createMany({
        data: [
            {
                id: (0, ids_1.newId)(),
                fullName: "Maya Sultana",
                companyName: "Nova Clinic",
                email: "maya@novaclinic.example",
                phone: "+8801700000001",
                source: "support_form",
                status: "new",
                notes: "Interested in after-hours appointment handling."
            },
            {
                id: (0, ids_1.newId)(),
                fullName: "Arif Hasan",
                companyName: "Pulse Commerce",
                email: "arif@pulsecommerce.example",
                phone: "+8801700000002",
                source: "book_a_call",
                status: "contacted",
                notes: "Needs multilingual voice flows."
            }
        ]
    });
}
async function main() {
    await clearData();
    await seedUser();
    await seedSingletons();
    await seedSectionStates();
    await seedCollections();
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
