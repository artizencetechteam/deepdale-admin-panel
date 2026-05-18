# Full API Documentation (Frontend Integration)

This document provides a comprehensive guide for integrating a frontend application (Next.js, Vite SPA, etc.) with the Deepdale Backend content APIs.

## Environments & Base URLs
- **Local Development**: `http://localhost:4000/api/content`
- **Production URL**: `https://your-production-url.com/api/content`

> **Note on Authentication**: Public content endpoints (`/api/content/*`) do not require authentication, sessions, or cookies. Admin routes (`/api/admin/*`) require secure session cookies.

---

## 1. Landing Page Payload (`GET /home`)

**Endpoint**: `GET /api/content/home`

Returns a massive, highly aggregated JSON payload containing all the data required to render the 16 content sections of the landing page.

### Features of this endpoint:
- **Visibility Filtering**: If a section is toggled "Hidden" in the CMS, its corresponding data key (e.g., `testimonials`) is entirely omitted from the response.
- **Draft Filtering**: Draft entries inside collections (e.g., a draft `ProductFeature`) are automatically filtered out.
- **Flattening**: Arrays like bullet points are flattened to strings for easy React rendering.

### Response Structure
```json
{
  "data": {
    "siteSettings": {
      "siteName": "Deepdale",
      "logoUrl": "...",
      "contactEmail": "...",
      "copyrightText": "..."
    },
    "sectionConfig": {
      "voiceAgentsHeading": "AI Voice Agents",
      "voiceAgentsSubheading": "..."
      // ... headings for all sections
    },
    "ratingSummary": {
      "score": "4.9",
      "reviewCount": "600+ Reviews",
      "starCount": 5
    },
    "sectionStates": [
      { "key": "HERO_SECTION", "isVisible": true, "sortOrder": 1 },
      { "key": "TESTIMONIALS_SECTION", "isVisible": true, "sortOrder": 2 }
    ],
    // The following blocks only appear if their section is visible!
    "heroOverview": { "headline": "...", "subheadline": "..." },
    "heroSection": { "heroHeading": "...", "heroTabs": ["Tab 1"] },
    "products": [ { "title": "Product 1", "image": "..." } ],
    "partners": [ { "name": "Company A", "logoSvg": "<svg>..." } ],
    "voiceScenarios": [ { "title": "Scenario 1", "script": "..." } ],
    "automationEngines": [ { "title": "Engine", "bulletPoints": ["Point 1"] } ],
    "capabilities": [ { "title": "Cap 1", "column": "left" } ],
    "roiIndustries": [ { "label": "Industry 1", "useCases": ["Case 1"] } ],
    "processSteps": [ { "title": "Step 1", "description": "..." } ],
    "productFeatures": [ { "title": "Feat 1", "column": "right" } ],
    "callers": [ { "name": "Cassie", "voicePitch": 1.08 } ],
    "testimonials": [ { "quote": "...", "author": "..." } ],
    "faq": [
      {
        "id": "cat-1",
        "label": "General Questions",
        "sortOrder": 1,
        "items": [ { "question": "Q1", "answer": "A1" } ]
      }
    ],
    "integrations": [ { "name": "Slack", "row": 1 } ],
    "supportFormConfig": { "heading": "Contact Us", "checkItems": ["24/7 Support"] }
  }
}
```

### Frontend Implementation Target
In your frontend, fetch this once at build time (Next.js `getStaticProps` or App Router `fetch()`) or dynamically. Iterate over the `sectionStates` array to determine rendering order:

```tsx
const { data } = await fetch('https://api.deepdale.com/api/content/home').then(r => r.json());

const orderedSections = data.sectionStates
  .filter(state => state.isVisible)
  .sort((a, b) => a.sortOrder - b.sortOrder);

return (
  <main>
    {orderedSections.map(section => {
      if (section.key === 'HERO_SECTION') return <HeroSection key={section.key} data={data.heroSection} />
      if (section.key === 'PRODUCT_SHOWCASE_SECTION') return <ProductShowcase data={data.products} />
      // ... map all 16 sections
    })}
  </main>
)
```

---

## 2. Navigation Elements

**Endpoint**: `GET /api/content/navigation`

Fetches the Header navigation items and the robust Mega-Menu layout structure.

```json
{
  "data": {
    "isVisible": true,
    "siteSettings": { "logoUrl": "..." },
    "navigationItems": [
      { "label": "Home", "href": "/", "hasDropdown": false }
    ],
    "megaMenu": {
      "platforms": [ { "title": "Platform 1", "iconName": "AppWindow" } ],
      "useCases": [ { "title": "Case 1", "iconName": "Briefcase" } ],
      "customers": [ { "title": "Customer 1", "iconName": "Users" } ]
    }
  }
}
```

**Endpoint**: `GET /api/content/footer`

Fetches Footer layouts, taglines, and grouped links.

```json
{
  "data": {
    "isVisible": true,
    "siteSettings": { "socialFacebook": "...", "copyrightText": "..." },
    "footerTagline": "Building the future...",
    "footerBrandText": "Deepdale AI",
    "linkGroups": [
      {
        "id": "group-1",
        "heading": "Company",
        "links": [ { "label": "About", "href": "/about" } ]
      }
    ]
  }
}
```

---

## 3. Submitting User Forms & Leads

**Endpoint**: `POST /api/content/leads`

This is the intake API for contact forms and "Book a Call" requests.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "companyName": "Acme Corp",
  "email": "john@acme.com",
  "phone": "+1-555-555-5555",
  "source": "support-form" // OR "book-a-call"
}
```

**Response:**
```json
{
  "data": {
    "id": "ckxyz123...",
    "status": "new",
    "successMessage": "Thank you. Your request has been received."
  }
}
```

---

## 4. Live Preview Mode (CMS Integration)

When an admin is in the CMS and clicks "Live Preview", the CMS will generate a temporary, signed **Preview Token**. 

If you pass `?previewToken=TOKEN` to any of the public GET endpoints (`/home`, `/navigation`, `/footer`), the API will change its behavior:
1. It bypasses `Cache-Control` (returns `no-store`).
2. It **includes** all `Hidden` sections (normalizes `isVisible: true`).
3. It **includes** all `Draft` items in collections.
4. Returns an extra `preview` object in the payload indicating preview status.

```ts
// Example: The CMS passes the token via a query param in the iframe
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('previewToken');

const apiUrl = token 
  ? `https://api.deepdale.com/api/content/home?previewToken=${token}` 
  : `https://api.deepdale.com/api/content/home`;

const res = await fetch(apiUrl);
```
