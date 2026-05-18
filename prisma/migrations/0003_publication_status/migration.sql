-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "product_cards" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "partners" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "voice_scenarios" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "automation_engines" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "capability_cards" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "industry_roi" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "process_steps" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "product_features" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "caller_profiles" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "testimonials" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "faq_categories" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "faq_items" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "integrations" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "navigation_items" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "mega_menu_items" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';
ALTER TABLE "footer_link_groups" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'published';

-- RedefineIndex
DROP INDEX "product_cards_sortOrder_idx";
DROP INDEX "partners_sortOrder_idx";
DROP INDEX "voice_scenarios_sortOrder_idx";
DROP INDEX "automation_engines_sortOrder_idx";
DROP INDEX "capability_cards_column_sortOrder_idx";
DROP INDEX "industry_roi_sortOrder_idx";
DROP INDEX "process_steps_sortOrder_idx";
DROP INDEX "product_features_column_sortOrder_idx";
DROP INDEX "caller_profiles_sortOrder_idx";
DROP INDEX "testimonials_sortOrder_idx";
DROP INDEX "faq_categories_sortOrder_idx";
DROP INDEX "faq_items_categoryId_sortOrder_idx";
DROP INDEX "integrations_row_sortOrder_idx";
DROP INDEX "navigation_items_sortOrder_idx";
DROP INDEX "mega_menu_items_column_sortOrder_idx";
DROP INDEX "footer_link_groups_sortOrder_idx";

CREATE INDEX "product_cards_publicationStatus_sortOrder_idx" ON "product_cards"("publicationStatus", "sortOrder");
CREATE INDEX "partners_publicationStatus_sortOrder_idx" ON "partners"("publicationStatus", "sortOrder");
CREATE INDEX "voice_scenarios_publicationStatus_sortOrder_idx" ON "voice_scenarios"("publicationStatus", "sortOrder");
CREATE INDEX "automation_engines_publicationStatus_sortOrder_idx" ON "automation_engines"("publicationStatus", "sortOrder");
CREATE INDEX "capability_cards_publicationStatus_column_sortOrder_idx" ON "capability_cards"("publicationStatus", "column", "sortOrder");
CREATE INDEX "industry_roi_publicationStatus_sortOrder_idx" ON "industry_roi"("publicationStatus", "sortOrder");
CREATE INDEX "process_steps_publicationStatus_sortOrder_idx" ON "process_steps"("publicationStatus", "sortOrder");
CREATE INDEX "product_features_publicationStatus_column_sortOrder_idx" ON "product_features"("publicationStatus", "column", "sortOrder");
CREATE INDEX "caller_profiles_publicationStatus_sortOrder_idx" ON "caller_profiles"("publicationStatus", "sortOrder");
CREATE INDEX "testimonials_publicationStatus_sortOrder_idx" ON "testimonials"("publicationStatus", "sortOrder");
CREATE INDEX "faq_categories_publicationStatus_sortOrder_idx" ON "faq_categories"("publicationStatus", "sortOrder");
CREATE INDEX "faq_items_publicationStatus_categoryId_sortOrder_idx" ON "faq_items"("publicationStatus", "categoryId", "sortOrder");
CREATE INDEX "integrations_publicationStatus_row_sortOrder_idx" ON "integrations"("publicationStatus", "row", "sortOrder");
CREATE INDEX "navigation_items_publicationStatus_sortOrder_idx" ON "navigation_items"("publicationStatus", "sortOrder");
CREATE INDEX "mega_menu_items_publicationStatus_column_sortOrder_idx" ON "mega_menu_items"("publicationStatus", "column", "sortOrder");
CREATE INDEX "footer_link_groups_publicationStatus_sortOrder_idx" ON "footer_link_groups"("publicationStatus", "sortOrder");
