# Deepdale API Integration Guide

This guide explains the easiest and most robust way to integrate the Deepdale Backend API into a separate React project.

## 1. Type Generation (The "Pro" Way)

The most efficient way to work with this API is to generate TypeScript types directly from the OpenAPI specification. This ensures your frontend stays perfectly in sync with the backend.

### Prerequisites
Install `openapi-typescript` in your React project:
```bash
npm install -D openapi-typescript
```

### Generating Types
Run the following command (replace `BACKEND_URL` with your actual backend location):
```bash
npx openapi-typescript http://BACKEND_URL/openapi.json -o src/types/api.ts
```

This will create a `src/types/api.ts` file containing all the types for requests and responses.

---

## 2. Setting Up an API Client

We recommend creating a simple, typed wrapper around `fetch`.

```typescript
// src/lib/api-client.ts
import { paths } from "../types/api"; // Types generated in step 1

const BASE_URL = "https://your-api-domain.com";

type Path = keyof paths;

export async function apiRequest<P extends Path, M extends keyof paths[P] & string>(
  path: P,
  method: M,
  options: {
    body?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
) {
  const url = new URL(`${BASE_URL}${path}`);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.append(k, v));
  }

  const response = await fetch(url.toString(), {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "API request failed");
  }

  return response.json() as Promise<any>; // You can refine this with generated response types
}
```

---

## 3. Data Fetching Examples (React Query)

Using `@tanstack/react-query` is the best way to handle state and caching in React.

### Fetching Hero Content
```tsx
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api-client";

export function useHero() {
  return useQuery({
    queryKey: ["hero"],
    queryFn: () => apiRequest("/api/content/hero", "get"),
  });
}
```

---

## 4. Public vs. Admin API

- **Public API (`/api/content/*`)**: Optimized for landing pages. These endpoints are cached and do not require authentication.
- **Admin API (`/api/admin/*`)**: Requires an active session cookie (`dd_admin_session`) and an `x-csrf-token` header for all mutation requests (`POST`, `PUT`, `DELETE`).

### Handling CSRF for Admin Mutations
When performing mutations, you must first get the CSRF token:

```typescript
// Fetch CSRF token after login
const { data: { csrfToken } } = await apiRequest("/api/admin/auth/csrf", "get");

// Include it in subsequent mutations
await apiRequest("/api/admin/hero", "put", {
  body: updatedHero,
  headers: { "x-csrf-token": csrfToken }
});
```

---

## 5. Landing Page Integration (Comprehensive)

The `/api/content/home` endpoint is designed to provide **everything** needed to render the landing page in a single request. 

### What's included?
The response `data` object contains schemas for over 15+ sections, including:
- **Hero & Overview**: `siteSettings`, `sectionConfig`, `heroOverview`, `heroSection`.
- **Products & Partners**: `products`, `partners`.
- **Technical & ROI**: `automationEngines`, `roiIndustries`, `capabilities`.
- **Proof & Trust**: `testimonials`, `ratingSummary`, `callers`.
- **Support & FAQ**: `faq`, `supportFormConfig`.

### Example: Rendering the FAQ Section
```tsx
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api-client";
import { components } from "../types/api";

type FaqCategory = components["schemas"]["FaqCategory"];

export function FaqSection() {
  const { data } = useQuery({
    queryKey: ["faq-content"],
    queryFn: () => apiRequest("/api/content/faq", "get"),
  });

  const faqData: FaqCategory[] = data?.data || [];

  return (
    <div>
      {faqData.map(category => (
        <div key={category.id}>
          <h3>{category.label}</h3>
          {category.items.map(item => (
            <div key={item.id}>
              <h4>{item.question}</h4>
              <p>{item.answer}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Example: Fetching Hero Data
```tsx
const heroQuery = useQuery({
  queryKey: ["hero-data"],
  queryFn: () => apiRequest("/api/content/hero", "get"),
});

// data structure: { data: { overview: { ... }, section: { ... } } }
```

---

## 5. Landing Page Integration (Comprehensive vs. Granular)

You have two robust options for integrating the landing page:

1.  **Aggregated (`/api/content/home`)**: Fetch **everything** (15+ sections) in one request. Ideal for full-page SSR or initial page load to minimize Round Trip Time (RTT).
2.  **Granular (`/api/content/*`)**: Fetch specific sections individually (e.g., `/api/content/products`, `/api/content/faq`). Ideal for component-level loading, skeleton screens, or performance-optimized client-side rendering.

### Available Granular Endpoints:
- `/api/content/site-settings`
- `/api/content/hero`
- `/api/content/products`
- `/api/content/partners`
- `/api/content/voice-scenarios`
- `/api/content/automation-engines`
- `/api/content/capabilities`
- `/api/content/roi-industries`
- `/api/content/process-steps`
- `/api/content/product-features`
- `/api/content/callers`
- `/api/content/testimonials`
- `/api/content/faq`
- `/api/content/integrations`
- `/api/content/support-form`
- `/api/content/footer`
- `/api/content/rating-summary`
- `/api/content/section-config`
- `/api/content/navigation`

---

## 6. Helpful Tips

- **Image URLs**: Most media assets return a `publicUrl`. This URL is typically absolute or relative to the backend. Ensure your frontend handles this correctly.
- **Section Visibility**: Always check the `sectionStates` array to determine if a section should be rendered at all.
- **Validation Errors**: The API returns detailed validation errors (status 400). Check the `error.details` object to show specific field errors to users.
