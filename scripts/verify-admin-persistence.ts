import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import request from "supertest";

import { createApp } from "../src/app";
import { env } from "../src/config/env";
import { verifyPassword } from "../src/lib/passwords";
import { prisma } from "../src/lib/prisma";

type Session = {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
};

function auditTag(label: string): string {
  return `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function expectStatus(
  actual: number,
  expected: number,
  context: string,
  body?: unknown
): void {
  assert.equal(
    actual,
    expected,
    `${context} failed with ${actual}: ${JSON.stringify(body)}`
  );
}

function logPass(message: string): void {
  console.log(`PASS ${message}`);
}

function siteSettingsPayload(record: {
  siteName: string;
  logoUrl: string;
  contactEmail: string;
  copyrightText: string;
  chatSystemPrompt: string;
  chatModel: string;
  socialFacebook: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
  socialTwitter: string | null;
}) {
  return {
    siteName: record.siteName,
    logoUrl: record.logoUrl,
    contactEmail: record.contactEmail,
    copyrightText: record.copyrightText,
    chatSystemPrompt: record.chatSystemPrompt,
    chatModel: record.chatModel,
    socialLinks: {
      facebook: record.socialFacebook ?? "",
      linkedin: record.socialLinkedin ?? "",
      youtube: record.socialYoutube ?? "",
      twitter: record.socialTwitter ?? ""
    }
  };
}

function heroPayload(record: {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  heroHeading: string;
  heroBackgroundImage: string;
  heroDashboardImage: string;
  heroTabs: Array<{ label: string; sortOrder: number }>;
  promptTemplates: Array<{ value: string; sortOrder: number }>;
}) {
  return {
    headline: record.headline,
    subheadline: record.subheadline,
    ctaText: record.ctaText,
    ctaLink: record.ctaLink,
    promptTemplates: [...record.promptTemplates]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.value),
    heroTabs: [...record.heroTabs]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.label),
    heroHeading: record.heroHeading,
    heroBackgroundImage: record.heroBackgroundImage,
    heroDashboardImage: record.heroDashboardImage
  };
}

function ratingSummaryPayload(record: {
  score: string;
  reviewCount: string;
  starCount: number;
}) {
  return {
    score: record.score,
    reviewCount: record.reviewCount,
    starCount: record.starCount
  };
}

function supportFormPayload(record: {
  heading: string;
  subheading: string;
  submitButtonText: string;
  successMessage: string;
  privacyPolicyText: string;
  privacyPolicyUrl: string;
  checkItems: Array<{ value: string; sortOrder: number }>;
}) {
  return {
    heading: record.heading,
    subheading: record.subheading,
    checkItems: [...record.checkItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.value),
    submitButtonText: record.submitButtonText,
    successMessage: record.successMessage,
    privacyPolicyText: record.privacyPolicyText,
    privacyPolicyUrl: record.privacyPolicyUrl
  };
}

function sectionConfigPayload(
  record: Awaited<ReturnType<typeof prisma.sectionConfig.findUniqueOrThrow>>
) {
  return {
    voiceAgentsHeading: record.voiceAgentsHeading,
    voiceAgentsSubheading: record.voiceAgentsSubheading,
    voiceAgentsBodyText: record.voiceAgentsBodyText,
    automationHeading: record.automationHeading,
    automationSubheading: record.automationSubheading,
    automationCtaBannerText: record.automationCtaBannerText,
    automationCtaBannerButton: record.automationCtaBannerButton,
    modelCreationLine1: record.modelCreationLine1,
    modelCreationLine2: record.modelCreationLine2,
    modelCreationLine3: record.modelCreationLine3,
    processStepsHeading: record.processStepsHeading,
    processStepsSubheading: record.processStepsSubheading,
    productsOverviewHeading: record.productsOverviewHeading,
    productsOverviewSubheading: record.productsOverviewSubheading,
    productFeaturesCenterImageUrl: record.productFeaturesCenterImageUrl,
    callerShowcaseHeading: record.callerShowcaseHeading,
    callerShowcaseSubheading: record.callerShowcaseSubheading,
    testimonialsHeading: record.testimonialsHeading,
    faqHeading: record.faqHeading,
    integrationsHeading: record.integrationsHeading,
    integrationsSubheading: record.integrationsSubheading,
    integrationsCtaText: record.integrationsCtaText,
    partnershipHeading: record.partnershipHeading,
    roiBadgeText: record.roiBadgeText,
    roiHeading: record.roiHeading,
    footerTagline: record.footerTagline,
    footerBrandText: record.footerBrandText
  };
}

async function login(): Promise<Session> {
  const agent = request.agent(createApp());
  const response = await agent.post("/api/admin/auth/login").send({
    email: env.ADMIN_SEED_EMAIL,
    password: env.ADMIN_SEED_PASSWORD
  });

  expectStatus(response.status, 200, "admin login", response.body);
  assert.ok(response.body?.data?.csrfToken, "login csrf token missing");

  return {
    agent,
    csrfToken: response.body.data.csrfToken as string
  };
}

async function verifySingletonPersistence(session: Session): Promise<void> {
  const originalSiteSettings = await prisma.siteSettings.findUniqueOrThrow({
    where: { id: 1 }
  });
  const updatedSiteSettings = {
    ...siteSettingsPayload(originalSiteSettings),
    siteName: auditTag("Deepdale Audit Site"),
    contactEmail: "audit+site@example.com",
    chatSystemPrompt: auditTag("Audit prompt"),
    socialLinks: {
      facebook: "",
      linkedin: "https://linkedin.com/company/deepdale-audit",
      youtube: "",
      twitter: "https://x.com/deepdale_audit"
    }
  };

  try {
    const response = await session.agent
      .put("/api/admin/site-settings")
      .set("x-csrf-token", session.csrfToken)
      .send(updatedSiteSettings);

    expectStatus(response.status, 200, "site settings update", response.body);

    const record = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
    assert.equal(record.siteName, updatedSiteSettings.siteName);
    assert.equal(record.contactEmail, updatedSiteSettings.contactEmail);
    assert.equal(record.socialFacebook, null);
    assert.equal(record.socialLinkedin, updatedSiteSettings.socialLinks.linkedin);
    assert.equal(record.socialYoutube, null);
    assert.equal(record.socialTwitter, updatedSiteSettings.socialLinks.twitter);
    logPass("site settings save to Postgres");
  } finally {
    await session.agent
      .put("/api/admin/site-settings")
      .set("x-csrf-token", session.csrfToken)
      .send(siteSettingsPayload(originalSiteSettings));
  }

  const originalHero = await prisma.heroContent.findUniqueOrThrow({
    where: { id: 1 },
    include: { heroTabs: true, promptTemplates: true }
  });
  const updatedHero = {
    ...heroPayload(originalHero),
    headline: auditTag("Audit Hero Headline"),
    subheadline: auditTag("Audit hero subheadline"),
    ctaText: "Launch Audit",
    ctaLink: "/audit-hero",
    heroHeading: auditTag("Audit Hero Heading"),
    heroBackgroundImage: "https://example.com/audit-hero-bg.png",
    heroDashboardImage: "https://example.com/audit-hero-dashboard.png",
    heroTabs: ["Audit Tab A", "Audit Tab B", "Audit Tab C"],
    promptTemplates: [
      "Audit hero prompt one",
      "Audit hero prompt two",
      "Audit hero prompt three"
    ]
  };

  try {
    const response = await session.agent
      .put("/api/admin/hero")
      .set("x-csrf-token", session.csrfToken)
      .send(updatedHero);

    expectStatus(response.status, 200, "hero update", response.body);

    const record = await prisma.heroContent.findUniqueOrThrow({
      where: { id: 1 },
      include: { heroTabs: true, promptTemplates: true }
    });

    assert.equal(record.headline, updatedHero.headline);
    assert.deepEqual(
      record.heroTabs
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.label),
      updatedHero.heroTabs
    );
    assert.deepEqual(
      record.promptTemplates
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.value),
      updatedHero.promptTemplates
    );
    logPass("hero singleton save to Postgres");
  } finally {
    await session.agent
      .put("/api/admin/hero")
      .set("x-csrf-token", session.csrfToken)
      .send(heroPayload(originalHero));
  }

  const originalRatingSummary = await prisma.ratingSummary.findUniqueOrThrow({
    where: { id: 1 }
  });
  const updatedRatingSummary = {
    score: "4.8",
    reviewCount: "612 Reviews",
    starCount: 5
  };

  try {
    const response = await session.agent
      .put("/api/admin/rating-summary")
      .set("x-csrf-token", session.csrfToken)
      .send(updatedRatingSummary);

    expectStatus(response.status, 200, "rating summary update", response.body);

    const record = await prisma.ratingSummary.findUniqueOrThrow({
      where: { id: 1 }
    });
    assert.equal(record.score, updatedRatingSummary.score);
    assert.equal(record.reviewCount, updatedRatingSummary.reviewCount);
    assert.equal(record.starCount, updatedRatingSummary.starCount);
    logPass("rating summary save to Postgres");
  } finally {
    await session.agent
      .put("/api/admin/rating-summary")
      .set("x-csrf-token", session.csrfToken)
      .send(ratingSummaryPayload(originalRatingSummary));
  }

  const originalSupportForm = await prisma.supportFormConfig.findUniqueOrThrow({
    where: { id: 1 },
    include: { checkItems: true }
  });
  const updatedSupportForm = {
    ...supportFormPayload(originalSupportForm),
    heading: auditTag("Audit lead form heading"),
    subheading: auditTag("Audit lead form subheading"),
    checkItems: ["Audit checklist one", "Audit checklist two", "Audit checklist three"],
    submitButtonText: "Submit Audit",
    successMessage: "Audit lead captured.",
    privacyPolicyText:
      '<p>Audit privacy notice with <strong>sanitized</strong> HTML.</p>',
    privacyPolicyUrl: "https://example.com/audit-privacy"
  };

  try {
    const response = await session.agent
      .put("/api/admin/support-form-config")
      .set("x-csrf-token", session.csrfToken)
      .send(updatedSupportForm);

    expectStatus(response.status, 200, "support form update", response.body);

    const record = await prisma.supportFormConfig.findUniqueOrThrow({
      where: { id: 1 },
      include: { checkItems: true }
    });
    assert.equal(record.heading, updatedSupportForm.heading);
    assert.deepEqual(
      record.checkItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.value),
      updatedSupportForm.checkItems
    );
    logPass("support form config save to Postgres");
  } finally {
    await session.agent
      .put("/api/admin/support-form-config")
      .set("x-csrf-token", session.csrfToken)
      .send(supportFormPayload(originalSupportForm));
  }

  const originalSectionConfig = await prisma.sectionConfig.findUniqueOrThrow({
    where: { id: 1 }
  });
  const updatedSectionConfig = {
    ...sectionConfigPayload(originalSectionConfig),
    voiceAgentsHeading: auditTag("Audit Voice Heading"),
    processStepsHeading: auditTag("Audit Process Heading"),
    footerTagline: auditTag("Audit footer tagline")
  };

  try {
    const response = await session.agent
      .put("/api/admin/section-config")
      .set("x-csrf-token", session.csrfToken)
      .send(updatedSectionConfig);

    expectStatus(response.status, 200, "section config update", response.body);

    const record = await prisma.sectionConfig.findUniqueOrThrow({ where: { id: 1 } });
    assert.equal(record.voiceAgentsHeading, updatedSectionConfig.voiceAgentsHeading);
    assert.equal(record.processStepsHeading, updatedSectionConfig.processStepsHeading);
    assert.equal(record.footerTagline, updatedSectionConfig.footerTagline);
    logPass("section config save to Postgres");
  } finally {
    await session.agent
      .put("/api/admin/section-config")
      .set("x-csrf-token", session.csrfToken)
      .send(sectionConfigPayload(originalSectionConfig));
  }
}

async function verifyCollectionPersistence(session: Session): Promise<void> {
  const productCreate = {
    brand: auditTag("Audit Brand"),
    image: "https://example.com/audit-product.png",
    title: auditTag("Audit Product"),
    description: "Audit product description",
    gradientPreset: "ocean-blue",
    buttonGradientPreset: "gold-lift",
    publicationStatus: "draft",
    sortOrder: 910
  };
  const productUpdate = {
    ...productCreate,
    title: auditTag("Updated Product"),
    buttonGradientPreset: "teal-circuit",
    sortOrder: 911
  };
  const productResponse = await session.agent
    .post("/api/admin/products")
    .set("x-csrf-token", session.csrfToken)
    .send(productCreate);
  expectStatus(productResponse.status, 201, "product create", productResponse.body);
  const productId = productResponse.body.data.id as string;
  try {
    let record = await prisma.productCard.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(record.title, productCreate.title);
    assert.equal(record.publicationStatus, "draft");
    const updateResponse = await session.agent
      .put(`/api/admin/products/${productId}`)
      .set("x-csrf-token", session.csrfToken)
      .send(productUpdate);
    expectStatus(updateResponse.status, 200, "product update", updateResponse.body);
    record = await prisma.productCard.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(record.title, productUpdate.title);
    assert.equal(record.sortOrder, productUpdate.sortOrder);
    assert.equal(record.publicationStatus, "draft");

    const homeDraftResponse = await request(createApp()).get("/api/content/home");
    expectStatus(
      homeDraftResponse.status,
      200,
      "public home with draft product",
      homeDraftResponse.body
    );
    assert.equal(
      (homeDraftResponse.body.data.products as Array<{ id: string }>).some(
        (item) => item.id === productId
      ),
      false
    );

    const publishResponse = await session.agent
      .patch(`/api/admin/products/${productId}/publication-status`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        publicationStatus: "published"
      });
    expectStatus(
      publishResponse.status,
      200,
      "product publish status update",
      publishResponse.body
    );

    record = await prisma.productCard.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(record.publicationStatus, "published");

    const homePublishedResponse = await request(createApp()).get("/api/content/home");
    expectStatus(
      homePublishedResponse.status,
      200,
      "public home with published product",
      homePublishedResponse.body
    );
    assert.equal(
      (homePublishedResponse.body.data.products as Array<{ id: string }>).some(
        (item) => item.id === productId
      ),
      true
    );

    logPass("product publish/draft workflow saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/products/${productId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const partnerCreate = {
    name: auditTag("Audit Partner"),
    logoSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0f766e"/></svg>',
    sortOrder: 910,
    isActive: true
  };
  const partnerResponse = await session.agent
    .post("/api/admin/partners")
    .set("x-csrf-token", session.csrfToken)
    .send(partnerCreate);
  expectStatus(partnerResponse.status, 201, "partner create", partnerResponse.body);
  const partnerId = partnerResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/partners/${partnerId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...partnerCreate,
        name: auditTag("Updated Partner"),
        isActive: false
      });
    expectStatus(updateResponse.status, 200, "partner update", updateResponse.body);
    const record = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
    assert.equal(record.isActive, false);
    logPass("partner CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/partners/${partnerId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const voiceScenarioCreate = {
    tag: "Audit Voice",
    title: auditTag("Voice Scenario"),
    description: "Audit voice scenario description",
    image: "https://example.com/audit-voice.png",
    script: "Hello from the Deepdale voice audit.",
    sortOrder: 910
  };
  const voiceScenarioResponse = await session.agent
    .post("/api/admin/voice-scenarios")
    .set("x-csrf-token", session.csrfToken)
    .send(voiceScenarioCreate);
  expectStatus(
    voiceScenarioResponse.status,
    201,
    "voice scenario create",
    voiceScenarioResponse.body
  );
  const voiceScenarioId = voiceScenarioResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/voice-scenarios/${voiceScenarioId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...voiceScenarioCreate,
        title: auditTag("Updated Voice Scenario"),
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "voice scenario update", updateResponse.body);
    const record = await prisma.voiceScenario.findUniqueOrThrow({
      where: { id: voiceScenarioId }
    });
    assert.equal(record.sortOrder, 911);
    logPass("voice scenario CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/voice-scenarios/${voiceScenarioId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const automationCreate = {
    tag: "Audit Engine",
    title: auditTag("Automation Engine"),
    bulletPoints: ["Audit rule one", "Audit rule two"],
    ctaLabel: "Audit CTA",
    ctaLink: "/audit-engine",
    ctaGradientPreset: "emerald-glow",
    image: "https://example.com/audit-engine.png",
    imageAlt: "Audit engine image",
    layoutDirection: "left",
    sortOrder: 910
  };
  const automationResponse = await session.agent
    .post("/api/admin/automation-engines")
    .set("x-csrf-token", session.csrfToken)
    .send(automationCreate);
  expectStatus(
    automationResponse.status,
    201,
    "automation engine create",
    automationResponse.body
  );
  const automationId = automationResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/automation-engines/${automationId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...automationCreate,
        bulletPoints: ["Updated rule one", "Updated rule two", "Updated rule three"],
        layoutDirection: "right",
        sortOrder: 911
      });
    expectStatus(
      updateResponse.status,
      200,
      "automation engine update",
      updateResponse.body
    );
    const record = await prisma.automationEngine.findUniqueOrThrow({
      where: { id: automationId },
      include: { bulletPoints: true }
    });
    assert.equal(record.layoutDirection, "right");
    assert.equal(record.bulletPoints.length, 3);
    logPass("automation engine CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/automation-engines/${automationId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const capabilityCreate = {
    title: auditTag("Capability"),
    description: "Audit capability description",
    iconName: "Bot",
    column: "left",
    sortOrder: 910
  };
  const capabilityResponse = await session.agent
    .post("/api/admin/capabilities")
    .set("x-csrf-token", session.csrfToken)
    .send(capabilityCreate);
  expectStatus(capabilityResponse.status, 201, "capability create", capabilityResponse.body);
  const capabilityId = capabilityResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/capabilities/${capabilityId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...capabilityCreate,
        column: "right",
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "capability update", updateResponse.body);
    const record = await prisma.capabilityCard.findUniqueOrThrow({
      where: { id: capabilityId }
    });
    assert.equal(record.column, "right");
    logPass("capability CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/capabilities/${capabilityId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const roiCreate = {
    label: auditTag("ROI"),
    image: "https://example.com/audit-roi.png",
    useCases: ["Audit booking", "Audit upsell"],
    cvr: "3.1x",
    secondaryMetric: "42%",
    audioLabel: "Audit Preview",
    audioDuration: "00:18",
    audioFile: "https://example.com/audit-preview.mp3",
    sortOrder: 910
  };
  const roiResponse = await session.agent
    .post("/api/admin/roi-industries")
    .set("x-csrf-token", session.csrfToken)
    .send(roiCreate);
  expectStatus(roiResponse.status, 201, "roi industry create", roiResponse.body);
  const roiId = roiResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/roi-industries/${roiId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...roiCreate,
        audioFile: "",
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "roi industry update", updateResponse.body);
    const record = await prisma.industryROI.findUniqueOrThrow({
      where: { id: roiId },
      include: { useCases: true }
    });
    assert.equal(record.audioFile, null);
    assert.equal(record.useCases.length, 2);
    logPass("ROI industry CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/roi-industries/${roiId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const processStepCreate = {
    label: "01",
    title: auditTag("Process Step"),
    description: "Audit process step description",
    sortOrder: 910
  };
  const processStepResponse = await session.agent
    .post("/api/admin/process-steps")
    .set("x-csrf-token", session.csrfToken)
    .send(processStepCreate);
  expectStatus(
    processStepResponse.status,
    201,
    "process step create",
    processStepResponse.body
  );
  const processStepId = processStepResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/process-steps/${processStepId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...processStepCreate,
        title: auditTag("Updated Process Step"),
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "process step update", updateResponse.body);
    const record = await prisma.processStep.findUniqueOrThrow({
      where: { id: processStepId }
    });
    assert.equal(record.sortOrder, 911);
    logPass("process step CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/process-steps/${processStepId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const productFeatureCreate = {
    title: auditTag("Feature"),
    subtitle: "Audit subtitle",
    description: "Audit product feature description",
    iconName: "Sparkles",
    column: "left",
    sortOrder: 910
  };
  const productFeatureResponse = await session.agent
    .post("/api/admin/product-features")
    .set("x-csrf-token", session.csrfToken)
    .send(productFeatureCreate);
  expectStatus(
    productFeatureResponse.status,
    201,
    "product feature create",
    productFeatureResponse.body
  );
  const productFeatureId = productFeatureResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/product-features/${productFeatureId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...productFeatureCreate,
        column: "right",
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "product feature update", updateResponse.body);
    const record = await prisma.productFeature.findUniqueOrThrow({
      where: { id: productFeatureId }
    });
    assert.equal(record.column, "right");
    logPass("product feature CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/product-features/${productFeatureId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const callerCreate = {
    name: auditTag("Caller"),
    role: "Audit Assistant",
    image: "https://example.com/audit-caller.png",
    sampleLine: "Hello, this is the audit caller.",
    voicePitch: 1.1,
    sortOrder: 910
  };
  const callerResponse = await session.agent
    .post("/api/admin/callers")
    .set("x-csrf-token", session.csrfToken)
    .send(callerCreate);
  expectStatus(callerResponse.status, 201, "caller create", callerResponse.body);
  const callerId = callerResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/callers/${callerId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...callerCreate,
        voicePitch: 1.4,
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "caller update", updateResponse.body);
    const record = await prisma.callerProfile.findUniqueOrThrow({
      where: { id: callerId }
    });
    assert.equal(record.voicePitch, 1.4);
    logPass("caller CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/callers/${callerId}`)
      .set("x-csrf-token", session.csrfToken);
  }
}

async function verifyRemainingCollections(session: Session): Promise<void> {
  const testimonialCreate = {
    quote: "Audit quote",
    author: "Audit Author",
    title: "Audit Title",
    avatar: "https://example.com/audit-avatar.png",
    rating: 5,
    sortOrder: 910,
    isActive: true
  };
  const testimonialResponse = await session.agent
    .post("/api/admin/testimonials")
    .set("x-csrf-token", session.csrfToken)
    .send(testimonialCreate);
  expectStatus(
    testimonialResponse.status,
    201,
    "testimonial create",
    testimonialResponse.body
  );
  const testimonialId = testimonialResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/testimonials/${testimonialId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...testimonialCreate,
        avatar: "",
        rating: null,
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "testimonial update", updateResponse.body);
    const record = await prisma.testimonial.findUniqueOrThrow({
      where: { id: testimonialId }
    });
    assert.equal(record.avatar, null);
    assert.equal(record.rating, null);
    logPass("testimonial CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/testimonials/${testimonialId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const categoryCreate = {
    label: auditTag("FAQ Category"),
    sortOrder: 910
  };
  const categoryResponse = await session.agent
    .post("/api/admin/faq-categories")
    .set("x-csrf-token", session.csrfToken)
    .send(categoryCreate);
  expectStatus(
    categoryResponse.status,
    201,
    "faq category create",
    categoryResponse.body
  );
  const categoryId = categoryResponse.body.data.id as string;
  try {
    const itemCreate = {
      categoryId,
      question: auditTag("FAQ Question"),
      answer: "Audit FAQ answer",
      sortOrder: 910,
      isActive: true
    };
    const itemResponse = await session.agent
      .post("/api/admin/faqs")
      .set("x-csrf-token", session.csrfToken)
      .send(itemCreate);
    expectStatus(itemResponse.status, 201, "faq item create", itemResponse.body);
    const itemId = itemResponse.body.data.id as string;
    try {
      const itemUpdateResponse = await session.agent
        .put(`/api/admin/faqs/${itemId}`)
        .set("x-csrf-token", session.csrfToken)
        .send({
          ...itemCreate,
          answer: "Updated audit FAQ answer",
          sortOrder: 911
        });
      expectStatus(
        itemUpdateResponse.status,
        200,
        "faq item update",
        itemUpdateResponse.body
      );
      const record = await prisma.faqItem.findUniqueOrThrow({
        where: { id: itemId }
      });
      assert.equal(record.answer, "Updated audit FAQ answer");
      logPass("FAQ category and item CRUD save to Postgres");
    } finally {
      await session.agent
        .delete(`/api/admin/faqs/${itemId}`)
        .set("x-csrf-token", session.csrfToken);
    }
  } finally {
    await session.agent
      .delete(`/api/admin/faq-categories/${categoryId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const integrationCreate = {
    name: auditTag("Integration"),
    shortLabel: "ADT",
    color: "#0f766e",
    logoUrl: "https://example.com/audit-integration.png",
    row: 1,
    sortOrder: 910,
    isActive: true
  };
  const integrationResponse = await session.agent
    .post("/api/admin/integrations")
    .set("x-csrf-token", session.csrfToken)
    .send(integrationCreate);
  expectStatus(
    integrationResponse.status,
    201,
    "integration create",
    integrationResponse.body
  );
  const integrationId = integrationResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/integrations/${integrationId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...integrationCreate,
        logoUrl: "",
        sortOrder: 911
      });
    expectStatus(updateResponse.status, 200, "integration update", updateResponse.body);
    const record = await prisma.integration.findUniqueOrThrow({
      where: { id: integrationId }
    });
    assert.equal(record.logoUrl, null);
    logPass("integration CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/integrations/${integrationId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const navigationItemCreate = {
    label: auditTag("Navigation"),
    href: "/audit-navigation",
    hasDropdown: false,
    sortOrder: 910
  };
  const navigationItemResponse = await session.agent
    .post("/api/admin/navigation-items")
    .set("x-csrf-token", session.csrfToken)
    .send(navigationItemCreate);
  expectStatus(
    navigationItemResponse.status,
    201,
    "navigation item create",
    navigationItemResponse.body
  );
  const navigationItemId = navigationItemResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/navigation-items/${navigationItemId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...navigationItemCreate,
        href: "",
        sortOrder: 911
      });
    expectStatus(
      updateResponse.status,
      200,
      "navigation item update",
      updateResponse.body
    );
    const record = await prisma.navigationItem.findUniqueOrThrow({
      where: { id: navigationItemId }
    });
    assert.equal(record.href, null);
    logPass("navigation item CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/navigation-items/${navigationItemId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const megaMenuCreate = {
    column: "platforms",
    title: auditTag("Mega Menu"),
    description: "Audit mega menu description",
    iconName: "Bot",
    iconColor: "#0f766e",
    isNew: true,
    link: "/audit-mega-menu",
    sortOrder: 910
  };
  const megaMenuResponse = await session.agent
    .post("/api/admin/mega-menu-items")
    .set("x-csrf-token", session.csrfToken)
    .send(megaMenuCreate);
  expectStatus(
    megaMenuResponse.status,
    201,
    "mega menu item create",
    megaMenuResponse.body
  );
  const megaMenuId = megaMenuResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/mega-menu-items/${megaMenuId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...megaMenuCreate,
        link: "",
        sortOrder: 911
      });
    expectStatus(
      updateResponse.status,
      200,
      "mega menu item update",
      updateResponse.body
    );
    const record = await prisma.megaMenuItem.findUniqueOrThrow({
      where: { id: megaMenuId }
    });
    assert.equal(record.link, null);
    logPass("mega menu item CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/mega-menu-items/${megaMenuId}`)
      .set("x-csrf-token", session.csrfToken);
  }

  const footerLinkGroupCreate = {
    heading: auditTag("Footer Group"),
    sortOrder: 910,
    links: [
      { label: "Audit Docs", href: "/audit-docs", sortOrder: 0 },
      { label: "Audit Pricing", href: "/audit-pricing", sortOrder: 1 }
    ]
  };
  const footerLinkGroupResponse = await session.agent
    .post("/api/admin/footer-link-groups")
    .set("x-csrf-token", session.csrfToken)
    .send(footerLinkGroupCreate);
  expectStatus(
    footerLinkGroupResponse.status,
    201,
    "footer link group create",
    footerLinkGroupResponse.body
  );
  const footerLinkGroupId = footerLinkGroupResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .put(`/api/admin/footer-link-groups/${footerLinkGroupId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        ...footerLinkGroupCreate,
        links: [
          { label: "Updated Audit Docs", href: "/audit-docs", sortOrder: 0 },
          { label: "Updated Audit Contact", href: "/audit-contact", sortOrder: 1 }
        ],
        sortOrder: 911
      });
    expectStatus(
      updateResponse.status,
      200,
      "footer link group update",
      updateResponse.body
    );
    const record = await prisma.footerLinkGroup.findUniqueOrThrow({
      where: { id: footerLinkGroupId },
      include: { links: true }
    });
    assert.equal(record.links.length, 2);
    assert.equal(
      record.links.sort((a, b) => a.sortOrder - b.sortOrder)[1]?.href,
      "/audit-contact"
    );
    logPass("footer link group CRUD saves to Postgres");
  } finally {
    await session.agent
      .delete(`/api/admin/footer-link-groups/${footerLinkGroupId}`)
      .set("x-csrf-token", session.csrfToken);
  }
}

async function verifySectionStatePersistence(session: Session): Promise<void> {
  const states = await prisma.sectionState.findMany({
    orderBy: { sortOrder: "asc" }
  });
  const first = states[0];
  const second = states[1];

  if (!first || !second) {
    throw new Error("section states are missing");
  }

  try {
    const visibilityResponse = await session.agent
      .patch(`/api/admin/section-states/${first.key}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        isVisible: !first.isVisible
      });
    expectStatus(
      visibilityResponse.status,
      200,
      "section visibility update",
      visibilityResponse.body
    );

    let record = await prisma.sectionState.findUniqueOrThrow({
      where: { key: first.key }
    });
    assert.equal(record.isVisible, !first.isVisible);

    const reorderResponse = await session.agent
      .patch("/api/admin/section-states/reorder")
      .set("x-csrf-token", session.csrfToken)
      .send([
        { key: first.key, sortOrder: second.sortOrder },
        { key: second.key, sortOrder: first.sortOrder }
      ]);
    expectStatus(
      reorderResponse.status,
      200,
      "section reorder update",
      reorderResponse.body
    );

    record = await prisma.sectionState.findUniqueOrThrow({
      where: { key: first.key }
    });
    assert.equal(record.sortOrder, second.sortOrder);
    logPass("section visibility and order save to Postgres");
  } finally {
    await session.agent
      .patch(`/api/admin/section-states/${first.key}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        isVisible: first.isVisible
      });
    await session.agent
      .patch("/api/admin/section-states/reorder")
      .set("x-csrf-token", session.csrfToken)
      .send([
        { key: first.key, sortOrder: first.sortOrder },
        { key: second.key, sortOrder: second.sortOrder }
      ]);
  }
}

async function verifyOperationalForms(session: Session): Promise<void> {
  const userCreate = {
    email: `audit-user-${Date.now()}@example.com`,
    name: "Audit User",
    role: "editor",
    password: "ChangeMe123!",
    isActive: true
  };
  const userResponse = await session.agent
    .post("/api/admin/users")
    .set("x-csrf-token", session.csrfToken)
    .send(userCreate);
  expectStatus(userResponse.status, 201, "user create", userResponse.body);
  const userId = userResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .patch(`/api/admin/users/${userId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        name: "Updated Audit User",
        role: "admin",
        isActive: false
      });
    expectStatus(updateResponse.status, 200, "user update", updateResponse.body);

    const passwordResponse = await session.agent
      .post(`/api/admin/users/${userId}/set-password`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        password: "ChangedAudit123!"
      });
    expectStatus(
      passwordResponse.status,
      204,
      "user password update",
      passwordResponse.text
    );

    const userRecord = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(userRecord.role, "admin");
    assert.equal(userRecord.isActive, false);
    assert.equal(
      await verifyPassword("ChangedAudit123!", userRecord.passwordHash),
      true
    );
    logPass("user management forms save to Postgres");
  } finally {
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  const publicLeadResponse = await request(createApp()).post("/api/content/leads").send({
    fullName: "Audit Lead",
    companyName: "Audit Co",
    email: `audit-lead-${Date.now()}@example.com`,
    phone: "+1-555-0100",
    source: "support-form"
  });
  expectStatus(
    publicLeadResponse.status,
    201,
    "public lead create",
    publicLeadResponse.body
  );
  const leadId = publicLeadResponse.body.data.id as string;
  try {
    const updateResponse = await session.agent
      .patch(`/api/admin/leads/${leadId}`)
      .set("x-csrf-token", session.csrfToken)
      .send({
        status: "qualified",
        notes: "Audit note"
      });
    expectStatus(updateResponse.status, 200, "lead update", updateResponse.body);

    const leadRecord = await prisma.leadSubmission.findUniqueOrThrow({
      where: { id: leadId }
    });
    assert.equal(leadRecord.status, "qualified");
    assert.equal(leadRecord.notes, "Audit note");
    logPass("public lead capture and admin lead update save to Postgres");
  } finally {
    await prisma.leadSubmission.delete({
      where: { id: leadId }
    });
  }

  const uploadResponse = await session.agent
    .post("/api/admin/media/upload")
    .set("x-csrf-token", session.csrfToken)
    .field("kind", "svg")
    .attach(
      "file",
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#0f766e"/></svg>'
      ),
      {
        filename: "audit-asset.svg",
        contentType: "image/svg+xml"
      }
    );
  expectStatus(uploadResponse.status, 201, "media upload", uploadResponse.body);
  const assetId = uploadResponse.body.data.id as string;
  try {
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    const assetPath = path.join(env.UPLOAD_DIR, ...asset.storageKey.split("/"));
    assert.equal(asset.kind, "svg");
    assert.equal(existsSync(assetPath), true);

    const deleteResponse = await session.agent
      .delete(`/api/admin/media/${assetId}`)
      .set("x-csrf-token", session.csrfToken);
    expectStatus(deleteResponse.status, 204, "media delete", deleteResponse.text);

    const deletedAsset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    assert.equal(deletedAsset, null);
    assert.equal(existsSync(assetPath), false);
    logPass("media upload metadata saves to Postgres");
  } catch (error) {
    await prisma.mediaAsset.deleteMany({ where: { id: assetId } });
    throw error;
  }
}

async function main(): Promise<void> {
  const session = await login();

  await verifySingletonPersistence(session);
  await verifyCollectionPersistence(session);
  await verifyRemainingCollections(session);
  await verifySectionStatePersistence(session);
  await verifyOperationalForms(session);

  console.log("Admin persistence audit completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
