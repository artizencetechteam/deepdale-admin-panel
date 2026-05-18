# Frontend API Integration

This document is the frontend handoff for the Deepdale backend. It reflects the current route behavior in `src/app.ts`, `src/modules/public/public-content.routes.ts`, and the admin/auth routes.

## Base URLs

- Local API origin: `http://127.0.0.1:4000`
- Public API base: `/api/content`
- Admin API base: `/api/admin`
- OpenAPI spec: `/openapi.json`

For browser requests from a separate frontend dev server, send credentials only for admin routes. Public content routes do not require cookies.

## Response Envelope

Successful JSON responses use:

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

## Public Endpoints

### `GET /api/content/home`

Use this as the main landing-page payload.

Optional query params:

- `previewToken`

Stable top-level keys:

- `siteSettings`
- `sectionConfig`
- `ratingSummary`
- `sectionStates`

Conditionally present keys:

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

Preview-only top-level key:

- `preview`

Important behavior:

- Hidden sections are omitted from the payload instead of being returned as empty arrays.
- Draft collection records are omitted from public payloads until they are published from admin.
- If `previewToken` is present and valid, hidden sections and draft records are included instead of filtered out.
- Preview responses send `Cache-Control: no-store`.
- `sectionStates` is always returned and includes `key`, `isVisible`, and `sortOrder`.
- `automationEngines[].bulletPoints` is already flattened to `string[]`.
- `roiIndustries[].useCases` is already flattened to `string[]`.
- `faq` is grouped by category as `{ id, label, sortOrder, items[] }`.

Suggested frontend pattern:

```ts
const response = await fetch(`${API_BASE}/api/content/home`);
const { data } = await response.json();

if (data.heroOverview) {
  renderHeroOverview(data.heroOverview);
}

const orderedSections = [...data.sectionStates]
  .filter((section) => section.isVisible)
  .sort((a, b) => a.sortOrder - b.sortOrder);
```

### `GET /api/content/navigation`

Use this for the header and mega menu.

Response shape:

- `isVisible`
- `siteSettings`
- `navigationItems`
- `megaMenu.platforms`
- `megaMenu.useCases`
- `megaMenu.customers`

Optional query params:

- `previewToken`

If `isVisible` is `false`, the frontend should not render the header navigation block.

Draft navigation and mega-menu items are excluded automatically.

With a valid `previewToken`, `isVisible` becomes `true`, draft items are included, and the response also includes `data.preview`.

### `GET /api/content/footer`

Use this for the footer.

Response shape:

- `isVisible`
- `siteSettings`
- `footerTagline`
- `footerBrandText`
- `linkGroups[]`

Optional query params:

- `previewToken`

Draft footer link groups are excluded automatically.

Each `linkGroups[]` item contains ordered `links[]`.

With a valid `previewToken`, `isVisible` becomes `true`, draft footer groups are included, and the response also includes `data.preview`.

### `POST /api/content/leads`

Use this for public support-form and book-a-call submission.

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

Use this only if public website chat is enabled.

Allowed request shapes:

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

Response shape:

```json
{
  "data": {
    "reply": "Assistant reply text",
    "model": "model-name"
  }
}
```

Expected error cases:

- `400 chat_empty`
- `429 chat_rate_limited`
- `503 chat_not_configured`

## Admin Integration

If the frontend is only consuming public content, you can stop here.

If you are building a custom admin client, use cookie-based auth plus CSRF protection.

### Admin auth flow

1. `POST /api/admin/auth/login`
2. Browser stores `dd_admin_session` and `dd_admin_csrf`
3. `GET /api/admin/auth/me`
4. `GET /api/admin/auth/csrf`
5. Send `x-csrf-token` on every mutating admin request

Login request:

```json
{
  "email": "admin@deepdale.local",
  "password": "ChangeMe123!"
}
```

Example admin fetch:

```ts
await fetch("/api/admin/products", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken
  },
  body: JSON.stringify(payload)
});
```

Rules:

- Always set `credentials: "include"` for admin routes.
- Do not send CSRF headers to public routes.
- Mutating admin routes will fail without both a valid session cookie and `x-csrf-token`.

### Admin preview flow

Use this when the frontend needs to render unpublished or hidden content safely for editors:

1. Authenticated admin client calls `GET /api/admin/preview/session`
2. Response returns signed preview URLs for:
   - `GET /api/content/home?previewToken=...`
   - `GET /api/content/navigation?previewToken=...`
   - `GET /api/content/footer?previewToken=...`
3. Frontend uses those URLs exactly as returned

Preview response notes:

- preview tokens currently expire after 30 minutes
- preview payloads include `data.preview`
- preview payloads bypass the normal public cache with `Cache-Control: no-store`
- preview URLs do not require cookies once generated

Example:

```ts
const previewSessionResponse = await fetch("/api/admin/preview/session", {
  credentials: "include"
});
const { data: previewSession } = await previewSessionResponse.json();

const homePreviewResponse = await fetch(previewSession.endpoints[0].absoluteUrl);
const { data: homePreview } = await homePreviewResponse.json();
```

## Media Handling

- Public/admin image and audio fields store full URLs or data URLs.
- Uploaded local files are served from `/uploads/*`.
- Admin media uploads return `publicUrl`; the frontend should store and reuse that value directly.

## Recommended Frontend Data Flow

1. Fetch `GET /api/content/navigation` for the header.
2. Fetch `GET /api/content/home` for the landing page body.
3. Fetch `GET /api/content/footer` for the footer.
4. Submit forms to `POST /api/content/leads`.
5. Call `POST /api/content/chat` only if chat UI is enabled in the product.
6. For editor preview mode, bootstrap with `GET /api/admin/preview/session` and then use the returned signed public URLs.

## Contract Sources

- Runtime OpenAPI: `/openapi.json`
- Snapshot in repo: `docs/openapi.json`
- Admin dashboard integration panel: `/admin`
