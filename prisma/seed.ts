import { prisma } from "../src/lib/prisma";
import { env } from "../src/config/env";
import { hashPassword } from "../src/lib/passwords";
import { newId } from "../src/lib/ids";
import { SECTION_KEYS } from "../src/constants/section-keys";

function svgDataUri(
  label: string,
  options?: {
    width?: number;
    height?: number;
    background?: string;
    foreground?: string;
    accent?: string;
  }
): string {
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

function imageAsset(label: string, accent: string): string {
  return svgDataUri(label, { accent });
}

function avatarAsset(label: string, accent: string): string {
  return svgDataUri(label, {
    width: 400,
    height: 400,
    accent,
    background: "#0b1220"
  });
}

function logoAsset(label: string): string {
  let slug = label.toLowerCase().replace(/\s+/g, "-");
  if (slug === "google-sheet") slug = "google-sheets";
  return `/images/integrations/${slug}.svg`;
}

async function clearData(): Promise<void> {
  await prisma.footerLink.deleteMany();
  await prisma.footerLinkGroup.deleteMany();
  await prisma.heroPromptTemplate.deleteMany();
  await prisma.heroTab.deleteMany();
  await prisma.automationEngineBullet.deleteMany();
  await prisma.industryROIUseCase.deleteMany();
  await prisma.supportFormCheckItem.deleteMany();
  await prisma.faqItem.deleteMany();
  await prisma.faqCategory.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.navigationItem.deleteMany();
  await prisma.megaMenuItem.deleteMany();
  await prisma.processStep.deleteMany();
  await prisma.productFeature.deleteMany();
  await prisma.capabilityCard.deleteMany();
  await prisma.automationEngine.deleteMany();
  await prisma.voiceScenario.deleteMany();
  await prisma.productCard.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.callerProfile.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.industryROI.deleteMany();
  await prisma.leadSubmission.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.sectionState.deleteMany();
  await prisma.supportFormConfig.deleteMany();
  await prisma.sectionConfig.deleteMany();
  await prisma.ratingSummary.deleteMany();
  await prisma.heroContent.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUser(): Promise<void> {
  await prisma.user.create({
    data: {
      id: newId(),
      email: env.ADMIN_SEED_EMAIL.toLowerCase().trim(),
      name: "Deepdale Super Admin",
      role: "superadmin",
      isActive: true,
      passwordHash: await hashPassword(env.ADMIN_SEED_PASSWORD)
    }
  });
}

async function seedSingletons(): Promise<void> {
  await prisma.siteSettings.create({
    data: {
      id: 1,
      siteName: "Deepdale",
      logoUrl: "/logo.png",
      contactEmail: "contact@deepdale.ai",
      copyrightText: "Copyright 2026 Deepdale. All rights reserved.",
      chatSystemPrompt:
        "You are Deepdale AI. Answer as a concise sales assistant for Deepdale products and qualify inbound leads.",
      chatModel: env.OPENAI_CHAT_MODEL_DEFAULT,
      socialFacebook: "https://facebook.com/deepdale",
      socialLinkedin: "https://linkedin.com/company/deepdale",
      socialYoutube: "https://youtube.com/@deepdale",
      socialTwitter: "https://x.com/deepdale"
    }
  });

  await prisma.heroContent.create({
    data: {
      id: 1,
      headline: "AI smart automation built to scale your business",
      subheadline:
        "Eliminate busywork, accelerate response times, and convert more conversations into revenue.",
      ctaText: "Book a Call",
      ctaLink: "/book-a-call",
      heroHeading: "Control every customer interaction from one dashboard",
      heroBackgroundImage: "/herobg.png",
      heroDashboardImage: "/voiceagent.png"
    }
  });

  await prisma.heroTab.createMany({
    data: [ 
      {
        id: newId(),
        heroContentId: 1,
        label: "VoiceAgent",
        image: "/voiceagent.png",
        sortOrder: 0
      },
      {
        id: newId(),
        heroContentId: 1,
        label: "Deep Agents",
        image: "/Deep Agent.png",
        sortOrder: 1
      }
    ]
  });

  await prisma.heroPromptTemplate.createMany({
    data: [
      "Build a lead qualification assistant for my SaaS homepage",
      "Show me how Deepdale handles after-hours support",
      "Design a voice workflow for appointment booking"
    ].map((value, sortOrder) => ({
      id: newId(),
      heroContentId: 1,
      value,
      sortOrder
    }))
  });

  await prisma.ratingSummary.create({
    data: {
      id: 1,
      score: "4.9",
      reviewCount: "600+ Reviews",
      starCount: 5
    }
  });

  await prisma.supportFormConfig.create({
    data: {
      id: 1,
      heading: "AI Agent for Customer Support",
      subheading:
        "Resolve repetitive tickets instantly and escalate complex issues with full context.",
      submitButtonText: "Book a Demo",
      successMessage:
        "Thank you. Your request has been received. A Deepdale specialist will reach out shortly.",
      privacyPolicyText:
        '<p>By submitting this form you agree to our <a href="https://deepdale.ai/privacy" target="_blank" rel="noreferrer">privacy policy</a>.</p>',
      privacyPolicyUrl: "https://deepdale.ai/privacy"
    }
  });

  await prisma.supportFormCheckItem.createMany({
    data: [
      "Seamless AI-to-human handoff via Live Chat",
      "AI Actions automate tasks and deliver immediate answers",
      "Dedicated customer success manager",
      "AI Boost™ enhances accuracy of your data sources",
      "Audience Creation with Custom Attributes"
    ].map((value, sortOrder) => ({
      id: newId(),
      supportFormConfigId: 1,
      value,
      sortOrder
    }))
  });

  await prisma.sectionConfig.create({
    data: {
      id: 1,
      voiceAgentsHeading: "AI voice agents that work 24/7",
      voiceAgentsSubheading:
        "Handle calls, book appointments, and qualify leads without adding headcount.",
      voiceAgentsBodyText:
        "Deploy voice workflows tailored to your scripts, systems, and handoff rules.",
      automationHeading: "Three powerful automation engines.",
      automationSubheading:
        "Each product works independently, but the real lift comes when you combine them.",
      automationCtaBannerText: "Create a flawless customer experience",
      automationCtaBannerButton: "Book a Call",
      modelCreationLine1: "Create your own",
      modelCreationLine2: "Model",
      modelCreationLine3: "With AI",
      processStepsHeading: "AI & automation steps",
      processStepsSubheading: "Client satisfaction is our first priority.",
      productsOverviewHeading:
        "Powerful AI products built to automate your business",
      productsOverviewSubheading:
        "Combine chat, voice, and workflow orchestration across the customer journey.",
      productFeaturesCenterImageUrl: imageAsset("Product Features", "#8b5cf6"),
      callerShowcaseHeading: "C'mon, make that call!",
      callerShowcaseSubheading: "Try callers, meet Paul and Cassie",
      testimonialsHeading: "Real stories, real results from Deepdale customers",
      faqHeading: "Have questions?",
      integrationsHeading: "Integrate with the tools you already use",
      integrationsSubheading:
        "Connect your CRM, helpdesk, telephony stack, and analytics tools.",
      integrationsCtaText: "Find more about our integrations",
      partnershipHeading: "Trusted by companies of all sizes",
      roiBadgeText: "Industry Use Cases",
      roiHeading: "ROI snapshot by industry",
      footerTagline:
        "AI-powered automation platform helping businesses unify customer support, sales, and operations.",
      footerBrandText: "Deepdale"
    }
  });
}

async function seedSectionStates(): Promise<void> {
  await prisma.sectionState.createMany({
    data: SECTION_KEYS.map((key, index) => ({
      key,
      isVisible: true,
      sortOrder: index
    }))
  });
}

async function seedCollections(): Promise<void> {
  await prisma.productCard.createMany({
    data: [
      {
        id: newId(),
        brand: "Chatzify",
        image: "/aichatbot.png",
        title: "The chatbot platform that gets the job done",
        description:
          "Build human-like AI chatbots for sales, support, and qualification workflows.",
        gradientPreset: "ocean-blue",
        buttonGradientPreset: "gold-lift",
        sortOrder: 0
      },
      {
        id: newId(),
        brand: "VoiceAgent",
        image: "/aivoiceagent.png",
        title: "Voice agents that answer, route, and convert",
        description:
          "Deploy AI voice agents to manage inbound calls and automate booking flows.",
        gradientPreset: "emerald-glow",
        buttonGradientPreset: "teal-circuit",
        sortOrder: 1
      },
      {
        id: newId(),
        brand: "AiAutomation",
        image: "/aiautomation.png",
        title: "Automate Follow-Ups & Business Processes",
        description:
          "Run automated follow-ups, escalations, and backend tasks across your entire workflow.",
        gradientPreset: "emerald-glow",
        buttonGradientPreset: "teal-circuit",
        sortOrder: 2
      }
    ]
  });

  await prisma.partner.createMany({
    data: [
      {
        id: newId(),
        name: "Nova Clinic",
        logoSvg:
          '<svg width="120" height="32" viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="32" rx="8" fill="#101828"/><text x="14" y="21" fill="#fff">Nova Clinic</text></svg>',
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        name: "Pulse Commerce",
        logoSvg:
          '<svg width="120" height="32" viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="32" rx="8" fill="#087a72"/><text x="14" y="21" fill="#fff">Pulse Commerce</text></svg>',
        sortOrder: 1,
        isActive: true
      }
    ]
  });

  await prisma.voiceScenario.createMany({
    data: [
      {
        id: newId(),
        tag: "Medical",
        title: "Dental clinic",
        description:
          "Listen how our AI Voice Agent politely reminds a client about their upcoming dental appointment.",
        image: "/images/agents/image1.png",
        script:
          "Hello, thanks for calling Nova Dental. I can help schedule, reschedule, or answer quick questions.",
        sortOrder: 0
      },
      {
        id: newId(),
        tag: "Real Estate",
        title: "Agentic Estate",
        description:
          "Watch how AI pulls full property details in seconds—making real estate searches faster than ever.",
        image: "/images/agents/image2.png",
        script:
          "Thanks for calling Deepdale. I can qualify your needs and book time with our team.",
        sortOrder: 1
      },
      {
        id: newId(),
        tag: "eCandleshop",
        title: "e-Commerce",
        description:
          "Hear how our AI Voice Agent manages a refund request from a frustrated customer with ease.",
        image: "/images/agents/image3.png",
        script:
          "Thanks for calling support. I can help with account access, billing and order updates. If needed, I will transfer you with complete notes.",
        sortOrder: 2
      },
      {
        id: newId(),
        tag: "CallFluent AI",
        title: "Demo Agent",
        description:
          "Hear how our AI Voice Agent walks a potential customer through our service with ease.",
        image: "/images/agents/image4.png",
        script:
          "Great news. I found available times this week on Wednesday at four or Friday at ten. Which one works better for you?",
        sortOrder: 3
      }
    ]
  });

  const automationOneId = newId();
  const automationTwoId = newId();
  const automationThreeId = newId();

  await prisma.automationEngine.createMany({
    data: [
      {
        id: automationOneId,
        tag: "AI Chatbot",
        title: "Smart conversations that turn visitors into customers",
        ctaLabel: "Try AI Chatbot",
        ctaLink: "/chatzify",
        ctaGradientPreset: "ocean-blue",
        image: "/images/automation-engines/9.png",
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
        image: "/images/automation-engines/10.png",
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
        image: "/images/automation-engines/11.png",
        imageAlt: "Workflow automation",
        layoutDirection: "left",
        sortOrder: 2
      }
    ]
  });

  await prisma.automationEngineBullet.createMany({
    data: [
      [
        "Engages website visitors instantly",
        "Answers FAQs using your business data",
        "Captures and qualifies leads",
        "Transfers complex queries to humans"
      ].map((value, sortOrder) => ({
        id: newId(),
        automationEngineId: automationOneId,
        value,
        sortOrder
      })),
      [
        "Answer incoming calls automatically",
        "Call leads instantly",
        "Book appointments directly into calendar",
        "Sound natural and human"
      ].map((value, sortOrder) => ({
        id: newId(),
        automationEngineId: automationTwoId,
        value,
        sortOrder
      })),
      [
        "Sends automatic emails & SMS",
        "Assigns leads to sales reps",
        "Updates CRM records",
        "Triggers multi-step workflows"
      ].map((value, sortOrder) => ({
        id: newId(),
        automationEngineId: automationThreeId,
        value,
        sortOrder
      }))
    ].flat()
  });

  await prisma.capabilityCard.createMany({
    data: [
      {
        id: newId(),
        title: "Data analytics",
        description:
          "Instant, reliable customer engagement.",
        iconName: "BarChart3",
        column: "left",
        sortOrder: 0
      },
      {
        id: newId(),
        title: "Workflow Automation",
        description:
          "Scalable integrations. Streamlined processes.",
        iconName: "Workflow",
        column: "left",
        sortOrder: 1
      },
      {
        id: newId(),
        title: "Real-time Analytics",
        description:
          "Record calls with a single click for easy tracking and insights.",
        iconName: "Chartline",
        column: "left",
        sortOrder: 2
      },
      {
        id: newId(),
        title: "Email automation",
        description:
          "Qualify and connect prospects in real time.",
        iconName: "Workflow",
        column: "middle",
        sortOrder: 0
      },
      {
        id: newId(),
        title: "Advanced Call Management",
        description:
          "Precision routing with structured follow-ups.",
        iconName: "Headset",
        column: "right",
        sortOrder: 0
      },
      {
        id: newId(),
        title: "CRM & System Integration",
        description:
          "Seamless connectivity across your tech stack.",
        iconName: "Crm",
        column: "right",
        sortOrder: 1
      },
      {
        id: newId(),
        title: "Marketing automation",
        description:
          "Hundreds of natural, production-ready voices.",
        iconName: "Marketing",
        column: "right",
        sortOrder: 2
      },
      {
        id: newId(),
        title: "HR automation",
        description:
          "Enable communication across a range of languages. Available in 30 languages",
        iconName: "HumanResources",
        column: "middle",
        sortOrder: 2
      },
    ]
  });

  const roiCarId = newId();
  const roiClinicId = newId();
  const roiEstateId = newId();

  await prisma.industryROI.createMany({
    data: [
      {
        id: roiCarId,
        label: "Car industry",
        image: "/roicar.png",
        cvr: "400%",
        secondaryMetric: "25-35%",
        audioLabel: "Hear it in action",
        audioDuration: "01:53",
        audioFile: null,
        sortOrder: 0
      },
      {
        id: roiClinicId,
        label: "E-Commarce",
        image: "/roicar.png",
        cvr: "280%",
        secondaryMetric: "18-22%",
        audioLabel: "Hear it in action",
        audioDuration: "01:21",
        audioFile: null,
        sortOrder: 1
      },
      {
        id: roiEstateId,
        label: "Estate Agent",
        image: "/roicar.png",
        cvr: "280%",
        secondaryMetric: "18-22%",
        audioLabel: "Hear it in action",
        audioDuration: "01:21",
        audioFile: null,
        sortOrder: 2
      }
    ]
  });

  await prisma.industryROIUseCase.createMany({
    data: [
      ["Lead Qualification", "Appointment Confirmation", "Support"].map(
        (value, sortOrder) => ({
          id: newId(),
          industryRoiId: roiCarId,
          value,
          sortOrder
        })
      ),
      ["Appointment Booking", "Prescription Refill", "Patient FAQ"].map(
        (value, sortOrder) => ({
          id: newId(),
          industryRoiId: roiClinicId,
          value,
          sortOrder
        })
      )
    ].flat()
  });

  await prisma.processStep.createMany({
    data: [
      {
        id: newId(),
        label: "01",
        title: "Strategic planning & solution mapping",
        description:
          "We capture goals, workflows, compliance needs, and customer intent paths.",
        sortOrder: 0
      },
      {
        id: newId(),
        label: "02",
        title: "Configuration and knowledge design",
        description:
          "We build the assistant, voice prompts, and routing logic around your business.",
        sortOrder: 1
      },
      {
        id: newId(),
        label: "03",
        title: "Launch and observe",
        description:
          "We roll out carefully, monitor interactions, and tighten weak spots quickly.",
        sortOrder: 2
      },
      {
        id: newId(),
        label: "04",
        title: "Optimize for conversion",
        description:
          "We refine prompts, automation triggers, and escalation flows against outcomes.",
        sortOrder: 3
      }
    ]
  });

  await prisma.productFeature.createMany({
    data: [
      {
        id: newId(),
        title: "Email Automation",
        subtitle: "Smart Customer Conversations",
        description:
          "Engage website visitors instantly and route them to the right path.",
        iconName: "Bot",
        column: "left",
        sortOrder: 0
      },
      {
        id: newId(),
        title: "Multichannel Messaging",
        subtitle: "Connect Everywhere",
        description:
          "Deploy your chatbot across Website, WhatsApp, and Messenger for seamless communication across platforms.",
        iconName: "Bot",
        column: "left",
        sortOrder: 1
      },
      {
        id: newId(),
        title: "Ai Voice Agent",
        subtitle: "Human-Like Call Handling",
        description:
          "Answer inbound calls, qualify leads, and book appointments automatically with natural AI voice responses.",
        iconName: "PhoneCall",
        column: "left",
        sortOrder: 2
      },
      {
        id: newId(),
        title: "Smart Call Booking",
        subtitle: "Calendar Integration",
        description:
          "Automatically schedule appointments during AI-powered calls without manual coordination.",
        iconName: "Calendar",
        column: "right",
        sortOrder: 0
      },
      {
        id: newId(),
        title: "AI Automation",
        subtitle: "Trigger-Based Workflows",
        description:
          "Create smart automation flows that send emails, assign leads, and update CRM systems instantly.",
        iconName: "Workflow",
        column: "right",
        sortOrder: 1
      },
      {
        id: newId(),
        title: "Unified Analytics Dashboard",
        subtitle: "Real-Time Insights",
        description:
          "Track conversations, call performance, and automation success from one powerful control panel.",
        iconName: "ChartPie",
        column: "right",
        sortOrder: 2
      },
    ]
  });

  await prisma.callerProfile.createMany({
    data: [
      {
        id: newId(),
        name: "Sarah Johnson",
        role: "CEO, TechStart",
        image: imageAsset("Sarah", "#ec4899"),
        sampleLine:
          "Our support costs dropped 60% while response times improved dramatically. The AI handles routine queries perfectly.",
        voicePitch: 1.08,
        sortOrder: 0
      },
      {
        id: newId(),
        name: "Michael Chen",
        role: "Marketing Director",
        image: imageAsset("Michael", "#14b8a6"),
        sampleLine:
          "We're converting 3x more visitors into qualified leads. The AI chatbot works 24/7 and never misses an opportunity.",
        voicePitch: 0.94,
        sortOrder: 1
      },
      // {
      //   id: newId(),
      //   name: "Emily Rodriguez",
      //   role: "Operations Manager",
      //   image: imageAsset("Emily", "#3b82f6"),
      //   sampleLine:
      //     "The voice agent handles appointment scheduling flawlessly. It's like having a full-time receptionist at a fraction of the cost.",
      //   voicePitch: 0.94,
      //   sortOrder: 1
      // }
    ]
  });

  await prisma.testimonial.createMany({
    data: [
      {
        id: newId(),
        quote:
          "Our support costs dropped 60% while response times improved dramatically. The AI handles routine queries perfectly.",
        author: "Sarah Johnson",
        title: "CEO, TechStart",
        avatar: avatarAsset("Sarah", "#8b5cf6"),
        rating: 5,
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        quote:
          "We're converting 3x more visitors into qualified leads. The AI chatbot works 24/7 and never misses an opportunity.",
        author: "Michael Chen",
        title: "Marketing Director",
        avatar: avatarAsset("Michael", "#14b8a6"),
        rating: 5,
        sortOrder: 1,
        isActive: true
      },
      {
        id: newId(),
        quote:
          "The voice agent handles appointment scheduling flawlessly. It's like having a full-time receptionist at a fraction of the cost.",
        author: "Emily Rodriguez",
        title: "Operations Manager",
        avatar: avatarAsset("Emily", "#3b82f6"),
        rating: 5,
        sortOrder: 2,
        isActive: true
      },
      {
        id: newId(),
        quote:
          "Deepdale's analytics gave us insights into customer behavior we never had before. We've optimized our entire sales funnel.",
        author: "David Kim",
        title: "VP of Sales, GrowthCorp",
        avatar: avatarAsset("David", "#f59e0b"),
        rating: 5,
        sortOrder: 3,
        isActive: true
      },
      {
        id: newId(),
        quote:
          "Setup took less than a day and the ROI was immediate. Our team spends more time on high-value tasks now.",
        author: "Lisa Thompson",
        title: "COO, FinServe Pro",
        avatar: avatarAsset("Lisa", "#ef4444"),
        rating: 5,
        sortOrder: 4,
        isActive: true
      },
      {
        id: newId(),
        quote:
          "Customer satisfaction scores went up 40% after we deployed the AI voice agent. Our clients love the instant responses.",
        author: "James Wilson",
        title: "Head of Customer Experience",
        avatar: avatarAsset("James", "#10b981"),
        rating: 5,
        sortOrder: 5,
        isActive: true
      }
    ]
  });

  const faqCategoryVoiceAgent = newId();
  const faqCategoryAiAutomation = newId();

  await prisma.faqCategory.createMany({
    data: [
      {
        id: faqCategoryVoiceAgent,
        label: "Voice Agent",
        sortOrder: 0
      },
      {
        id: faqCategoryAiAutomation,
        label: "AI Automation",
        sortOrder: 1
      }
    ]
  });

  await prisma.faqItem.createMany({
    data: [
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "How many agents can we add?",
        answer:
          "Most medical centers offer charity programs, counseling, and financial assistance for those in need. Non-Muslims are welcome to visit mosques. They should dress modestly and remove their shoes upon entering. Through advanced algorithms and machine learning, AI can analyze vast amounts of medical data.",
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "How can I book an appointment for emergency treatment?",
        answer:
          "Emergency booking can be handled through your hotline flow or website form, and the AI can route urgent cases instantly to on-call staff.",
        sortOrder: 1,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "Do you limit the number of concurrent chats?",
        answer:
          "No fixed limit is enforced in normal usage. Capacity scales based on your plan and infrastructure configuration.",
        sortOrder: 2,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "Is our data safe?",
        answer:
          "Yes. Data is protected with encryption in transit and at rest, with role-based access and audit controls available.",
        sortOrder: 3,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "Are there any Ads?",
        answer:
          "No. The platform experience is ad-free.",
        sortOrder: 4,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "Does this integrate with CRM?",
        answer:
          "Yes. It integrates with common CRM systems and can push leads, notes, and status updates automatically.",
        sortOrder: 5,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryVoiceAgent,
        question: "How long does setup take?",
        answer:
          "Most setups go live in a few days depending on integration scope, routing rules, and content readiness.",
        sortOrder: 6,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "What does AI automation handle?",
        answer:
          "AI automation handles follow-ups, notifications, CRM updates, and multi-step workflows across your customer journey.",
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "Can automation trigger custom workflows?",
        answer:
          "Yes. You can configure triggers for events such as form submissions, appointment bookings, and lead scoring.",
        sortOrder: 1,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "How do I connect my CRM?",
        answer:
          "CRM integration is available through native connectors and API-based workflows, enabling automated data syncs and task updates.",
        sortOrder: 2,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "Is training required for automation?",
        answer:
          "No manual model training is required. The system uses pre-built automation templates that can be customized to your operations.",
        sortOrder: 3,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "Does this work with voice and chat?",
        answer:
          "Yes. AI automation can coordinate both voice and chat interactions to create a seamless customer experience.",
        sortOrder: 4,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "Can I customize the automation rules?",
        answer:
          "Absolutely. Rules, timing, and escalation logic can all be adapted to your business needs.",
        sortOrder: 5,
        isActive: true
      },
      {
        id: newId(),
        categoryId: faqCategoryAiAutomation,
        question: "How quickly can I start using it?",
        answer:
          "Most customers begin testing automation workflows within a few days of setup and integration.",
        sortOrder: 6,
        isActive: true
      }
    ]
  });

  await prisma.integration.createMany({
    data: [
      {
        id: newId(),
        name: "Intercom",
        shortLabel: "I",
        color: "#0A054D",
        logoUrl: logoAsset("Intercom"),
        row: 1,
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        name: "GitLab",
        shortLabel: "GL",
        color: "#FC6D26",
        logoUrl: logoAsset("GitLab"),
        row: 1,
        sortOrder: 1,
        isActive: true
      },
      {
        id: newId(),
        name: "Zapier",
        shortLabel: "Z",
        color: "#FF4F00",
        logoUrl: logoAsset("Zapier"),
        row: 1,
        sortOrder: 2,
        isActive: true
      },
      {
        id: newId(),
        name: "HubSpot",
        shortLabel: "HS",
        color: "#FF7A59",
        logoUrl: logoAsset("HubSpot"),
        row: 1,
        sortOrder: 3,
        isActive: true
      },
      {
        id: newId(),
        name: "Mailchimp",
        shortLabel: "MC",
        color: "#FFE01B",
        logoUrl: logoAsset("Mailchimp"),
        row: 1,
        sortOrder: 4,
        isActive: true
      },
      {
        id: newId(),
        name: "Notion",
        shortLabel: "N",
        color: "#111111",
        logoUrl: logoAsset("Notion"),
        row: 1,
        sortOrder: 5,
        isActive: true
      },
      {
        id: newId(),
        name: "Dropbox",
        shortLabel: "DB",
        color: "#0061FF",
        logoUrl: logoAsset("Dropbox"),
        row: 2,
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        name: "Google Sheet",
        shortLabel: "GS",
        color: "#34A853",
        logoUrl: logoAsset("Google Sheet"),
        row: 2,
        sortOrder: 1,
        isActive: true
      },
      {
        id: newId(),
        name: "Zendesk",
        shortLabel: "ZD",
        color: "#03363D",
        logoUrl: logoAsset("Zendesk"),
        row: 2,
        sortOrder: 2,
        isActive: true
      },
      {
        id: newId(),
        name: "Strapi",
        shortLabel: "ST",
        color: "#4945FF",
        logoUrl: logoAsset("Strapi"),
        row: 2,
        sortOrder: 3,
        isActive: true
      },
      {
        id: newId(),
        name: "Slack",
        shortLabel: "SL",
        color: "#611F69",
        logoUrl: logoAsset("Slack"),
        row: 2,
        sortOrder: 4,
        isActive: true
      },
      {
        id: newId(),
        name: "Salesforce",
        shortLabel: "SF",
        color: "#00A1E0",
        logoUrl: logoAsset("Salesforce"),
        row: 2,
        sortOrder: 5,
        isActive: true
      },
      {
        id: newId(),
        name: "Jira",
        shortLabel: "JR",
        color: "#2684FF",
        logoUrl: logoAsset("Jira"),
        row: 3,
        sortOrder: 0,
        isActive: true
      },
      {
        id: newId(),
        name: "Figma",
        shortLabel: "FG",
        color: "#1E1E1E",
        logoUrl: logoAsset("Figma"),
        row: 3,
        sortOrder: 1,
        isActive: true
      },
      {
        id: newId(),
        name: "Analytics",
        shortLabel: "AN",
        color: "#F9AB00",
        logoUrl: logoAsset("Analytics"),
        row: 3,
        sortOrder: 2,
        isActive: true
      },
      {
        id: newId(),
        name: "Shopify",
        shortLabel: "SH",
        color: "#95BF47",
        logoUrl: logoAsset("Shopify"),
        row: 3,
        sortOrder: 3,
        isActive: true
      },
      {
        id: newId(),
        name: "Gmail",
        shortLabel: "GM",
        color: "#EA4335",
        logoUrl: logoAsset("Gmail"),
        row: 3,
        sortOrder: 4,
        isActive: true
      },
      {
        id: newId(),
        name: "Pipedrive",
        shortLabel: "PD",
        color: "#1F2A37",
        logoUrl: logoAsset("Pipedrive"),
        row: 3,
        sortOrder: 5,
        isActive: true
      }
    ]
  });

  await prisma.navigationItem.createMany({
    data: [
      {
        id: newId(),
        label: "Platform",
        href: null,
        hasDropdown: true,
        sortOrder: 0
      },
      {
        id: newId(),
        label: "Use Cases",
        href: null,
        hasDropdown: true,
        sortOrder: 1
      },
      {
        id: newId(),
        label: "Pricing",
        href: "/pricing",
        hasDropdown: false,
        sortOrder: 2
      }
    ]
  });

  await prisma.megaMenuItem.createMany({
    data: [
      {
        id: newId(),
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
        id: newId(),
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
        id: newId(),
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

  const footerProductId = newId();
  const footerCompanyId = newId();
  const footerResourcesId = newId();

  await prisma.footerLinkGroup.createMany({
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

  await prisma.footerLink.createMany({
    data: [
      {
        id: newId(),
        footerLinkGroupId: footerProductId,
        label: "Chatzify",
        href: "/chatzify",
        sortOrder: 0
      },
      {
        id: newId(),
        footerLinkGroupId: footerProductId,
        label: "VoiceAgent",
        href: "/voiceagent",
        sortOrder: 1
      },
      {
        id: newId(),
        footerLinkGroupId: footerCompanyId,
        label: "About",
        href: "/about",
        sortOrder: 0
      },
      {
        id: newId(),
        footerLinkGroupId: footerResourcesId,
        label: "Blog",
        href: "/blog",
        sortOrder: 0
      }
    ]
  });

  await prisma.leadSubmission.createMany({
    data: [
      {
        id: newId(),
        fullName: "Maya Sultana",
        companyName: "Nova Clinic",
        email: "maya@novaclinic.example",
        phone: "+8801700000001",
        source: "support_form",
        status: "new",
        notes: "Interested in after-hours appointment handling."
      },
      {
        id: newId(),
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

async function main(): Promise<void> {
  await clearData();
  await seedUser();
  await seedSingletons();
  await seedSectionStates();
  await seedCollections();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
