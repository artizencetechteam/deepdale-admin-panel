-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('superadmin', 'admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'closed');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('support_form', 'book_a_call');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'audio', 'svg', 'document');

-- CreateEnum
CREATE TYPE "SectionKey" AS ENUM ('PRODUCT_SHOWCASE_OVERVIEW', 'HERO_SECTION', 'PRODUCT_SHOWCASE_SECTION', 'PARTNERSHIP_SECTION', 'VOICE_AGENTS_SECTION', 'AUTOMATION_ENGINES_SECTION', 'MODEL_CREATION_GRID_SECTION', 'ROI_SNAPSHOT_SECTION', 'PROCESS_STEPS_SECTION', 'POWERFUL_PRODUCTS_OVERVIEW_SECTION', 'CALLER_SHOWCASE_SECTION', 'TESTIMONIALS_SECTION', 'FAQ_SECTION', 'INTEGRATIONS_SECTION', 'SUPPORT_LEAD_FORM_SECTION', 'SITE_FOOTER_SECTION', 'HEADER', 'CHAT');

-- CreateEnum
CREATE TYPE "LayoutDirection" AS ENUM ('left', 'right');

-- CreateEnum
CREATE TYPE "CapabilityColumn" AS ENUM ('left', 'middle', 'right');

-- CreateEnum
CREATE TYPE "ProductFeatureColumn" AS ENUM ('left', 'right');

-- CreateEnum
CREATE TYPE "MegaMenuColumn" AS ENUM ('platforms', 'useCases', 'customers');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceLabel" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "ipAddress" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_states" (
    "key" "SectionKey" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_states_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL,
    "siteName" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "copyrightText" TEXT NOT NULL,
    "chatSystemPrompt" TEXT NOT NULL,
    "chatModel" TEXT NOT NULL,
    "socialFacebook" TEXT,
    "socialLinkedin" TEXT,
    "socialYoutube" TEXT,
    "socialTwitter" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_content" (
    "id" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "heroHeading" TEXT NOT NULL,
    "heroBackgroundImage" TEXT NOT NULL,
    "heroDashboardImage" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_tabs" (
    "id" TEXT NOT NULL,
    "heroContentId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "hero_tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_prompt_templates" (
    "id" TEXT NOT NULL,
    "heroContentId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "hero_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cards" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gradientPreset" TEXT NOT NULL,
    "buttonGradientPreset" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoSvg" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_scenarios" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_engines" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "ctaGradientPreset" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "layoutDirection" "LayoutDirection" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_engines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_engine_bullets" (
    "id" TEXT NOT NULL,
    "automationEngineId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "automation_engine_bullets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_cards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconName" TEXT NOT NULL,
    "column" "CapabilityColumn" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_roi" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "cvr" TEXT NOT NULL,
    "secondaryMetric" TEXT NOT NULL,
    "audioLabel" TEXT NOT NULL,
    "audioDuration" TEXT NOT NULL,
    "audioFile" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_roi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_roi_use_cases" (
    "id" TEXT NOT NULL,
    "industryRoiId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "industry_roi_use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_steps" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_features" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconName" TEXT NOT NULL,
    "column" "ProductFeatureColumn" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caller_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "sampleLine" TEXT NOT NULL,
    "voicePitch" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "avatar" TEXT,
    "rating" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_summary" (
    "id" INTEGER NOT NULL,
    "score" TEXT NOT NULL,
    "reviewCount" TEXT NOT NULL,
    "starCount" INTEGER NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rating_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "row" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_form_config" (
    "id" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "subheading" TEXT NOT NULL,
    "submitButtonText" TEXT NOT NULL,
    "successMessage" TEXT NOT NULL,
    "privacyPolicyText" TEXT NOT NULL,
    "privacyPolicyUrl" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_form_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_form_check_items" (
    "id" TEXT NOT NULL,
    "supportFormConfigId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "support_form_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "hasDropdown" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mega_menu_items" (
    "id" TEXT NOT NULL,
    "column" "MegaMenuColumn" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconName" TEXT NOT NULL,
    "iconColor" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mega_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_link_groups" (
    "id" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "footer_link_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_links" (
    "id" TEXT NOT NULL,
    "footerLinkGroupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "footer_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_config" (
    "id" INTEGER NOT NULL,
    "voiceAgentsHeading" TEXT NOT NULL,
    "voiceAgentsSubheading" TEXT NOT NULL,
    "voiceAgentsBodyText" TEXT NOT NULL,
    "automationHeading" TEXT NOT NULL,
    "automationSubheading" TEXT NOT NULL,
    "automationCtaBannerText" TEXT NOT NULL,
    "automationCtaBannerButton" TEXT NOT NULL,
    "modelCreationLine1" TEXT NOT NULL,
    "modelCreationLine2" TEXT NOT NULL,
    "modelCreationLine3" TEXT NOT NULL,
    "processStepsHeading" TEXT NOT NULL,
    "processStepsSubheading" TEXT NOT NULL,
    "productsOverviewHeading" TEXT NOT NULL,
    "productsOverviewSubheading" TEXT NOT NULL,
    "productFeaturesCenterImageUrl" TEXT NOT NULL,
    "callerShowcaseHeading" TEXT NOT NULL,
    "callerShowcaseSubheading" TEXT NOT NULL,
    "testimonialsHeading" TEXT NOT NULL,
    "faqHeading" TEXT NOT NULL,
    "integrationsHeading" TEXT NOT NULL,
    "integrationsSubheading" TEXT NOT NULL,
    "integrationsCtaText" TEXT NOT NULL,
    "partnershipHeading" TEXT NOT NULL,
    "roiBadgeText" TEXT NOT NULL,
    "roiHeading" TEXT NOT NULL,
    "footerTagline" TEXT NOT NULL,
    "footerBrandText" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_submissions" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_resourceType_createdAt_idx" ON "activity_logs"("resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_actorUserId_createdAt_idx" ON "activity_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionTokenHash_key" ON "sessions"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_attemptedAt_idx" ON "login_attempts"("ipAddress", "attemptedAt");

-- CreateIndex
CREATE INDEX "login_attempts_email_attemptedAt_idx" ON "login_attempts"("email", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storageKey_key" ON "media_assets"("storageKey");

-- CreateIndex
CREATE INDEX "hero_tabs_heroContentId_sortOrder_idx" ON "hero_tabs"("heroContentId", "sortOrder");

-- CreateIndex
CREATE INDEX "hero_prompt_templates_heroContentId_sortOrder_idx" ON "hero_prompt_templates"("heroContentId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_cards_publicationStatus_sortOrder_idx" ON "product_cards"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "partners_publicationStatus_sortOrder_idx" ON "partners"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "voice_scenarios_publicationStatus_sortOrder_idx" ON "voice_scenarios"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "automation_engines_publicationStatus_sortOrder_idx" ON "automation_engines"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "automation_engine_bullets_automationEngineId_sortOrder_idx" ON "automation_engine_bullets"("automationEngineId", "sortOrder");

-- CreateIndex
CREATE INDEX "capability_cards_publicationStatus_column_sortOrder_idx" ON "capability_cards"("publicationStatus", "column", "sortOrder");

-- CreateIndex
CREATE INDEX "industry_roi_publicationStatus_sortOrder_idx" ON "industry_roi"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "industry_roi_use_cases_industryRoiId_sortOrder_idx" ON "industry_roi_use_cases"("industryRoiId", "sortOrder");

-- CreateIndex
CREATE INDEX "process_steps_publicationStatus_sortOrder_idx" ON "process_steps"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "product_features_publicationStatus_column_sortOrder_idx" ON "product_features"("publicationStatus", "column", "sortOrder");

-- CreateIndex
CREATE INDEX "caller_profiles_publicationStatus_sortOrder_idx" ON "caller_profiles"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "testimonials_publicationStatus_sortOrder_idx" ON "testimonials"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "faq_categories_publicationStatus_sortOrder_idx" ON "faq_categories"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "faq_items_publicationStatus_categoryId_sortOrder_idx" ON "faq_items"("publicationStatus", "categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "integrations_publicationStatus_row_sortOrder_idx" ON "integrations"("publicationStatus", "row", "sortOrder");

-- CreateIndex
CREATE INDEX "support_form_check_items_supportFormConfigId_sortOrder_idx" ON "support_form_check_items"("supportFormConfigId", "sortOrder");

-- CreateIndex
CREATE INDEX "navigation_items_publicationStatus_sortOrder_idx" ON "navigation_items"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "mega_menu_items_publicationStatus_column_sortOrder_idx" ON "mega_menu_items"("publicationStatus", "column", "sortOrder");

-- CreateIndex
CREATE INDEX "footer_link_groups_publicationStatus_sortOrder_idx" ON "footer_link_groups"("publicationStatus", "sortOrder");

-- CreateIndex
CREATE INDEX "footer_links_footerLinkGroupId_sortOrder_idx" ON "footer_links"("footerLinkGroupId", "sortOrder");

-- CreateIndex
CREATE INDEX "lead_submissions_submittedAt_idx" ON "lead_submissions"("submittedAt");

-- CreateIndex
CREATE INDEX "lead_submissions_status_submittedAt_idx" ON "lead_submissions"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_tabs" ADD CONSTRAINT "hero_tabs_heroContentId_fkey" FOREIGN KEY ("heroContentId") REFERENCES "hero_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_prompt_templates" ADD CONSTRAINT "hero_prompt_templates_heroContentId_fkey" FOREIGN KEY ("heroContentId") REFERENCES "hero_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_engine_bullets" ADD CONSTRAINT "automation_engine_bullets_automationEngineId_fkey" FOREIGN KEY ("automationEngineId") REFERENCES "automation_engines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_roi_use_cases" ADD CONSTRAINT "industry_roi_use_cases_industryRoiId_fkey" FOREIGN KEY ("industryRoiId") REFERENCES "industry_roi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_form_check_items" ADD CONSTRAINT "support_form_check_items_supportFormConfigId_fkey" FOREIGN KEY ("supportFormConfigId") REFERENCES "support_form_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footer_links" ADD CONSTRAINT "footer_links_footerLinkGroupId_fkey" FOREIGN KEY ("footerLinkGroupId") REFERENCES "footer_link_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

