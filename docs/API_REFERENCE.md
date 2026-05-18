# Deepdale API Reference

This document describes the current Deepdale backend API exposed by `src/app.ts`.

## Base URLs

- Local API origin: `http://127.0.0.1:4000`
- Public API base: `/api/content`
- Admin API base: `/api/admin`
- OpenAPI JSON: `/openapi.json`
- Health check: `/health`

## Response Format

Successful JSON responses use the envelope:

```json
{
  "data": {}
}
```

Error responses use:

```json
{
  "error": {
    "code": "string_code",
    "message": "Human readable message",
    "details": {}
  }
}
```

Non-JSON exceptions:

- `204 No Content` responses have an empty body.
- TTS preview endpoints return `audio/mpeg`.
- Lead export returns `text/csv`.

## Auth and CSRF

Public endpoints do not require cookies.

Admin routes use cookie-based session auth:

1. `POST /api/admin/auth/login`
2. Browser stores the session cookie
3. Read current user with `GET /api/admin/auth/me`
4. Read CSRF token with `GET /api/admin/auth/csrf`
5. Send `x-csrf-token` on every admin write request

Rules:

- Use `credentials: "include"` for admin requests from browsers.
- Mutating admin routes require both a valid session and `x-csrf-token`.
- Optional URL fields can be cleared by sending `""`; the backend stores `NULL`.

## Roles

Roles are:

- `viewer`
- `editor`
- `admin`
- `superadmin`

Role rules used across the API:

- `viewer+`: `viewer`, `editor`, `admin`, `superadmin`
- `editor+`: `editor`, `admin`, `superadmin`
- `admin+`: `admin`, `superadmin`
- `superadmin`: `superadmin` only

## Core Endpoints

### `GET /`

Service metadata.

Response:

```json
{
  "data": {
    "service": "deepdale-backend",
    "status": "ok",
    "environment": "development",
    "docsUrl": "/openapi.json",
    "healthUrl": "/health",
    "publicApiBase": "/api/content",
    "adminApiBase": "/api/admin"
  }
}
```

### `GET /health`

Runtime health.

Response:

```json
{
  "data": {
    "status": "ok",
    "environment": "development",
    "uptimeSeconds": 123
  }
}
```

### `GET /openapi.json`

Machine-readable contract snapshot.

## Public API

### `GET /api/content/home`

Main landing-page payload.

Auth: public

Optional query params:

- `previewToken`

Response `data` always includes:

- `siteSettings`
- `sectionConfig`
- `ratingSummary`
- `sectionStates`

Preview responses also include:

- `preview.enabled`
- `preview.expiresAt`
- `preview.includesDrafts`
- `preview.includesHiddenSections`

Response `data` conditionally includes section payloads when visible:

- `heroOverview`
- `heroSection`
- `products`
- `partners`
- `voiceScenarios`
- `automationEngines`
- `capabilities`
- `roiIndustries`
- `processSteps`
- `productFeatures`
- `callers`
- `testimonials`
- `faq`
- `integrations`
- `supportFormConfig`

Important behavior:

- Hidden sections are omitted instead of returned as empty arrays.
- Draft collection records are omitted from public payloads by default.
- If `previewToken` is provided and valid, hidden sections are included, draft records are included, and `sectionStates[].isVisible` is normalized to `true`.
- Preview responses are served with `Cache-Control: no-store`.
- `automationEngines[].bulletPoints` is returned as `string[]`.
- `roiIndustries[].useCases` is returned as `string[]`.
- `faq` is grouped by category.

### `GET /api/content/navigation`

Header and mega-menu payload.

Auth: public

Optional query params:

- `previewToken`

Response `data`:

- `isVisible`
- `siteSettings`
- `navigationItems`
- `megaMenu.platforms`
- `megaMenu.useCases`
- `megaMenu.customers`

Preview responses also include `preview`.

Behavior:

- Draft navigation and mega-menu items are omitted by default.
- If `previewToken` is provided and valid, `isVisible` becomes `true` even if the header is hidden and draft items are included.
- Preview responses are served with `Cache-Control: no-store`.

### `GET /api/content/footer`

Footer payload.

Auth: public

Optional query params:

- `previewToken`

Response `data`:

- `isVisible`
- `siteSettings`
- `footerTagline`
- `footerBrandText`
- `linkGroups`

Preview responses also include `preview`.

Behavior:

- Draft footer groups are omitted by default.
- If `previewToken` is provided and valid, `isVisible` becomes `true` even if the footer is hidden and draft footer groups are included.
- Preview responses are served with `Cache-Control: no-store`.

### `POST /api/content/leads`

Public support-form or book-a-call submission.

Auth: public

Request body:

```json
{
  "fullName": "Jane Doe",
  "companyName": "Acme Inc",
  "email": "jane@example.com",
  "phone": "+1-555-0100",
  "source": "support-form"
}
```

Allowed `source` values:

- `support-form`
- `book-a-call`

Success response:

```json
{
  "data": {
    "id": "lead_id",
    "status": "new",
    "successMessage": "Thank you. Your request has been received."
  }
}
```

### `POST /api/content/chat`

Website assistant endpoint.

Auth: public

Accepted request shapes:

```json
{
  "prompt": "Tell me about Deepdale"
}
```

or

```json
{
  "messages": [
    { "role": "user", "content": "Tell me about Deepdale" }
  ]
}
```

Success response:

```json
{
  "data": {
    "reply": "Assistant reply text",
    "model": "model-name"
  }
}
```

Common errors:

- `400 chat_empty`
- `429 chat_rate_limited`
- `503 chat_not_configured`

## Admin Auth API

### `POST /api/admin/auth/login`

Auth: public

Request body:

```json
{
  "email": "admin@deepdale.local",
  "password": "ChangeMe123!"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "user_id",
      "email": "admin@deepdale.local",
      "name": "Deepdale Super Admin",
      "role": "superadmin",
      "isActive": true,
      "lastLoginAt": "2026-03-08T00:00:00.000Z",
      "createdAt": "2026-03-08T00:00:00.000Z",
      "updatedAt": "2026-03-08T00:00:00.000Z"
    },
    "csrfToken": "csrf_token"
  }
}
```

### `POST /api/admin/auth/logout`

Auth: authenticated

Headers:

- `x-csrf-token`

Response: `204 No Content`

### `GET /api/admin/auth/me`

Auth: authenticated

Response `data`: current user.

### `GET /api/admin/auth/csrf`

Auth: authenticated

Response:

```json
{
  "data": {
    "csrfToken": "csrf_token"
  }
}
```

## Admin Utility API

### `GET /api/admin/meta/ui-options`

Auth: `viewer+`

Response `data`:

- `gradientPresets[]`
- `iconNames[]`

### `GET /api/admin/dashboard/overview`

Auth: `viewer+`

Response `data`:

- `totalLeads`
- `newLeads24h`
- `totalSectionsActive`
- `hiddenSections`
- `contentItems`
- `draftItems`
- `recentLeads[]`
- `recentActivity[]`
- `sectionManagers[]`
- `quickActions[]`
- `frontendEndpoints[]`

Notes:

- `recentActivity` is populated for `admin+` sessions.
- `recentActivity` is returned as `[]` for `viewer` and `editor` sessions.
- `frontendEndpoints` includes both public payload routes and the session-based preview bootstrap route.

### `GET /api/admin/preview/session`

Auth: `viewer+`

Purpose:

- creates a short-lived signed preview token
- returns ready-to-use preview URLs for `/api/content/home`, `/api/content/navigation`, and `/api/content/footer`

Response:

```json
{
  "data": {
    "token": "signed_preview_token",
    "expiresAt": "2026-03-09T12:30:00.000Z",
    "requestedByUserId": "user_id",
    "endpoints": [
      {
        "key": "home",
        "label": "Landing page payload",
        "path": "/api/content/home?previewToken=signed_preview_token",
        "absoluteUrl": "http://127.0.0.1:4000/api/content/home?previewToken=signed_preview_token"
      }
    ]
  }
}
```

Notes:

- preview tokens currently expire after 30 minutes
- preview tokens allow read-only access to draft and hidden public payloads
- preview requests do not require cookies once the token is embedded in the URL

### `GET /api/admin/activity-log`

Auth: `admin+`

Query params:

- `action`
- `resourceType`
- `userId`
- `dateFrom`
- `dateTo`
- `limit`

Response `data`: `ActivityLogEntry[]`

Each entry includes:

- `id`
- `actorUserId`
- `actorRole`
- `actorName`
- `actorEmail`
- `action`
- `resourceType`
- `resourceId`
- `resourceLabel`
- `summary`
- `metadata`
- `ipAddress`
- `createdAt`

Notes:

- This feed records admin content writes, section visibility/order changes, user management, lead updates, media uploads/deletes, and admin login/logout events.
- `resourceType` uses the admin resource key such as `hero`, `products`, `users`, `media`, or `section-states`.

### `POST /api/admin/tts/preview/voice-scenario`
### `POST /api/admin/tts/preview/caller`

Auth: `editor+`

Request body:

```json
{
  "text": "Preview this script",
  "voicePitch": 1.1
}
```

Response: `audio/mpeg`

Notes:

- These endpoints do not write to Postgres.
- They return `503 tts_not_configured` when TTS is disabled.

## Admin Users API

All user routes are `superadmin` only.

### `GET /api/admin/users`

Response `data`: `AdminUser[]`

### `POST /api/admin/users`

Headers:

- `x-csrf-token`

Request body:

```json
{
  "email": "editor@example.com",
  "name": "Editor User",
  "role": "editor",
  "password": "ChangeMe123!",
  "isActive": true
}
```

### `PATCH /api/admin/users/:id`

Headers:

- `x-csrf-token`

Request body:

```json
{
  "email": "editor@example.com",
  "name": "Updated Editor",
  "role": "admin",
  "isActive": false
}
```

### `POST /api/admin/users/:id/set-password`

Headers:

- `x-csrf-token`

Request body:

```json
{
  "password": "NewStrongPassword123!"
}
```

Response: `204 No Content`

## Admin Leads API

### `GET /api/admin/leads`

Auth: `viewer`, `admin`, `superadmin`

Query params:

- `status`
- `source`
- `dateFrom`
- `dateTo`
- `search`

Response `data`: `LeadRecord[]`

### `GET /api/admin/leads/export.csv`

Auth: `admin+`

Same query params as list.

Response: `text/csv`

### `GET /api/admin/leads/:id`

Auth: `viewer`, `admin`, `superadmin`

Response `data`: one lead.

### `PATCH /api/admin/leads/:id`

Auth: `admin+`

Headers:

- `x-csrf-token`

Request body:

```json
{
  "status": "qualified",
  "notes": "Interested in enterprise plan"
}
```

## Admin Media API

### `GET /api/admin/media`

Auth: `viewer+`

Response `data`: `MediaAsset[]`

### `POST /api/admin/media/upload`

Auth: `editor+`

Headers:

- `x-csrf-token`

Content type: `multipart/form-data`

Fields:

- `file`: uploaded file
- `kind`: optional hint, must match MIME type when provided

Accepted MIME types:

- `image/png`
- `image/jpeg`
- `image/webp`
- `image/svg+xml`
- `audio/mpeg`
- `audio/wav`
- `audio/x-wav`

Response `data`:

- `id`
- `kind`
- `filename`
- `originalFilename`
- `mimeType`
- `sizeBytes`
- `storageKey`
- `publicUrl`
- `createdByUserId`
- `createdAt`
- `updatedAt`

### `DELETE /api/admin/media/:id`

Auth: `editor+`

Headers:

- `x-csrf-token`

Response: `204 No Content`

## Admin CMS Resource Patterns

### Singleton resources

Methods:

- `GET /api/admin/{resource}`
- `PUT /api/admin/{resource}`

Write requests require `x-csrf-token`.

### Collection resources

Methods:

- `GET /api/admin/{resource}`
- `GET /api/admin/{resource}/:id`
- `POST /api/admin/{resource}`
- `PUT /api/admin/{resource}/:id`
- `DELETE /api/admin/{resource}/:id`
- `PATCH /api/admin/{resource}/reorder`

Reorder request body:

```json
[
  { "id": "record_1", "sortOrder": 0 },
  { "id": "record_2", "sortOrder": 1 }
]
```

Reorder response:

```json
{
  "success": true
}
```

## Admin CMS Resources

### `GET|PUT /api/admin/site-settings`

Read: `viewer+`

Write: `admin+`

Request body:

```json
{
  "siteName": "Deepdale",
  "logoUrl": "https://example.com/logo.svg",
  "contactEmail": "contact@example.com",
  "copyrightText": "Copyright 2026 Deepdale",
  "chatSystemPrompt": "System prompt",
  "chatModel": "gpt-4o-mini",
  "socialLinks": {
    "facebook": "https://facebook.com/deepdale",
    "linkedin": "https://linkedin.com/company/deepdale",
    "youtube": "https://youtube.com/@deepdale",
    "twitter": "https://x.com/deepdale"
  }
}
```

Response `data`:

- admin response includes all fields above plus `createdAt`, `updatedAt`
- viewer response omits `chatSystemPrompt` and `chatModel`

### `GET|PUT /api/admin/hero`

Read: `viewer+`

Write: `editor+`

Request body:

```json
{
  "headline": "Headline",
  "subheadline": "Subheadline",
  "ctaText": "Book a Call",
  "ctaLink": "/book-a-call",
  "promptTemplates": ["Prompt one", "Prompt two"],
  "heroTabs": ["Chatzify", "VoiceAgent"],
  "heroHeading": "Hero heading",
  "heroBackgroundImage": "https://example.com/hero-bg.png",
  "heroDashboardImage": "https://example.com/dashboard.png"
}
```

Response `data`: same fields plus `createdAt`, `updatedAt`

### Collection resources and payloads

- `/api/admin/products`
  Body fields: `brand`, `image`, `title`, `description`, `gradientPreset`, `buttonGradientPreset`, `sortOrder`, optional `publicationStatus`
- `/api/admin/partners`
  Body fields: `name`, `logoSvg`, `sortOrder`, `isActive`, optional `publicationStatus`
- `/api/admin/voice-scenarios`
  Body fields: `tag`, `title`, `description`, `image`, `script`, `sortOrder`, optional `publicationStatus`
- `/api/admin/automation-engines`
  Body fields: `tag`, `title`, `bulletPoints[]`, `ctaLabel`, `ctaLink`, `ctaGradientPreset`, `image`, `imageAlt`, `layoutDirection`, `sortOrder`, optional `publicationStatus`
- `/api/admin/capabilities`
  Body fields: `title`, `description`, `iconName`, `column`, `sortOrder`, optional `publicationStatus`
- `/api/admin/roi-industries`
  Body fields: `label`, `image`, `useCases[]`, `cvr`, `secondaryMetric`, `audioLabel`, `audioDuration`, `audioFile`, `sortOrder`, optional `publicationStatus`
- `/api/admin/process-steps`
  Body fields: `label`, `title`, `description`, `sortOrder`, optional `publicationStatus`
- `/api/admin/product-features`
  Body fields: `title`, `subtitle`, `description`, `iconName`, `column`, `sortOrder`, optional `publicationStatus`
- `/api/admin/callers`
  Body fields: `name`, `role`, `image`, `sampleLine`, `voicePitch`, `sortOrder`, optional `publicationStatus`
- `/api/admin/testimonials`
  Body fields: `quote`, `author`, `title`, `avatar`, `rating`, `sortOrder`, `isActive`, optional `publicationStatus`
- `/api/admin/faq-categories`
  Body fields: `label`, `sortOrder`, optional `publicationStatus`
- `/api/admin/faqs`
  Body fields: `categoryId`, `question`, `answer`, `sortOrder`, `isActive`, optional `publicationStatus`
- `/api/admin/integrations`
  Body fields: `name`, `shortLabel`, `color`, `logoUrl`, `row`, `sortOrder`, `isActive`, optional `publicationStatus`
- `/api/admin/navigation-items`
  Body fields: `label`, `href`, `hasDropdown`, `sortOrder`, optional `publicationStatus`
- `/api/admin/mega-menu-items`
  Body fields: `column`, `title`, `description`, `iconName`, `iconColor`, `isNew`, `link`, `sortOrder`, optional `publicationStatus`
- `/api/admin/footer-link-groups`
  Body fields: `heading`, `sortOrder`, `links[]`, optional `publicationStatus`

Collection response items always include:

- `id`
- resource fields
- `createdAt`
- `updatedAt`

Resource-specific response notes:

- testimonials return `avatar` and `rating` as nullable fields
- FAQs return `categoryLabel`
- footer link groups return nested `links[]` with `id`, `label`, `href`, `sortOrder`
- automation engines return flattened `bulletPoints[]`
- ROI industries return flattened `useCases[]`
- public-facing collection resources include `publicationStatus`

### Publication endpoints

Supported collection resources also expose:

- `PATCH /api/admin/{resource}/:id/publication-status`

Headers:

- `x-csrf-token`

Request body:

```json
{
  "publicationStatus": "draft"
}
```

Allowed values:

- `draft`
- `published`

### `GET|PUT /api/admin/rating-summary`

Read: `viewer+`

Write: `editor+`

Body fields:

- `score`
- `reviewCount`
- `starCount`

### `GET|PUT /api/admin/support-form-config`

Read: `viewer+`

Write: `editor+`

Body fields:

- `heading`
- `subheading`
- `checkItems[]`
- `submitButtonText`
- `successMessage`
- `privacyPolicyText`
- `privacyPolicyUrl`

### `GET|PUT /api/admin/section-config`

Read: `viewer+`

Write: `editor+`

Body fields:

- `voiceAgentsHeading`
- `voiceAgentsSubheading`
- `voiceAgentsBodyText`
- `automationHeading`
- `automationSubheading`
- `automationCtaBannerText`
- `automationCtaBannerButton`
- `modelCreationLine1`
- `modelCreationLine2`
- `modelCreationLine3`
- `processStepsHeading`
- `processStepsSubheading`
- `productsOverviewHeading`
- `productsOverviewSubheading`
- `productFeaturesCenterImageUrl`
- `callerShowcaseHeading`
- `callerShowcaseSubheading`
- `testimonialsHeading`
- `faqHeading`
- `integrationsHeading`
- `integrationsSubheading`
- `integrationsCtaText`
- `partnershipHeading`
- `roiBadgeText`
- `roiHeading`
- `footerTagline`
- `footerBrandText`

### Section state endpoints

#### `GET /api/admin/section-states`

Read: `viewer+`

Response `data`: `SectionState[]`

Each item:

- `key`
- `isVisible`
- `sortOrder`
- `updatedByUserId`
- `updatedAt`

#### `PATCH /api/admin/section-states/:key`

Write: `editor+`

Headers:

- `x-csrf-token`

Request body:

```json
{
  "isVisible": true,
  "sortOrder": 3
}
```

#### `PATCH /api/admin/section-states/reorder`

Write: `editor+`

Headers:

- `x-csrf-token`

Request body:

```json
[
  { "key": "HERO_SECTION", "sortOrder": 1 },
  { "key": "PRODUCT_SHOWCASE_SECTION", "sortOrder": 2 }
]
```

Response:

```json
{
  "success": true
}
```

## Contract Sources

- Runtime contract: `/openapi.json`
- Repo snapshot: `docs/openapi.json`
- Frontend handoff summary: `docs/FRONTEND_API_INTEGRATION.md`
