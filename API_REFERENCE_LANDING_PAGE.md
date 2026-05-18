# Deepdale Landing Page: API Integration Reference (v2)

This document provides a simple and perfect guide for integrating all landing page sections from the backend into another project.

## Base URL
- **Local**: `http://localhost:4000`
- **Production**: `https://admin-deepdale.netlify.app` (or your specific backend URL)

## API Envelope
All public endpoints follow this standard response structure:
```json
{
  "data": { ... },
  "preview": { "enabled": false } // Present if a previewToken is used
}
```

---

## 1. Global Setup & Header

### Site Settings
General metadata, logos, and social links.
- **Endpoint**: `GET /api/content/site-settings`
- **Response Sample**:
```json
{
  "data": {
    "siteName": "Deepdale AI",
    "logoUrl": "https://...",
    "contactEmail": "support@deepdale.ai",
    "copyrightText": "© 2026 Deepdale AI",
    "socialLinkedin": "https://linkedin.com/..."
  }
}
```

### Navigation & Header
Data for the top navigation bars and Mega Menu.
- **Endpoint**: `GET /api/content/navigation`
- **Response Sample**:
```json
{
  "data": {
    "isVisible": true,
    "siteSettings": { ... },
    "navigationItems": [
      { "label": "Platform", "href": "#platform", "sortOrder": 1 }
    ],
    "megaMenu": {
      "platforms": [{ "title": "Voice AI", "description": "High fidelity voice...", "iconName": "mic", "isNew": true }],
      "useCases": [],
      "customers": []
    }
  }
}
```

---

## 2. Main Page Sections

### 1. Hero Content
Headline, CTA, and AI prompt suggestions.
- **Endpoint**: `GET /api/content/hero`
- **Response Sample**:
```json
{
  "data": {
    "overview": {
      "headline": "Build a super voice agent",
      "subheadline": "The first AI platform for real-time commerce.",
      "ctaText": "Get Started",
      "ctaLink": "/signup",
      "promptTemplates": ["Can you build a bot...", "Generate a script..."]
    },
    "section": {
      "heroHeading": "Revolutionizing Customer Interaction",
      "heroTabs": ["Inbound", "Outbound", "Support"],
      "heroBackgroundImage": "https://...",
      "heroDashboardImage": "https://..."
    }
  }
}
```

### 2. Product Showcase
The scrolling cards featuring your core products/features.
- **Endpoint**: `GET /api/content/products`
- **Response Sample**:
```json
{
  "data": [
    {
      "id": "prod_1",
      "brand": "Deepdale AI",
      "image": "https://...",
      "title": "Voice Engine v2",
      "description": "Lower latency, higher quality.",
      "gradientPreset": "purple-blue",
      "buttonGradientPreset": "cool-blue"
    }
  ]
}
```

### 3. Voice Agents (Voice Scenarios)
Interactive scenarios showing voice bot capabilities.
- **Endpoint**: `GET /api/content/voice-scenarios`
- **Response Sample**:
```json
{
  "data": [
    {
      "id": "voice_1",
      "tag": "Inbound Sales",
      "title": "Closing calls instantly",
      "description": "Watch how our AI handles complex objections.",
      "videoUrl": "https://...",
      "avatarImage": "https://..."
    }
  ]
}
```

### 4. ROI Snapshot (Industries)
Metrics showing the return on investment for different industries.
- **Endpoint**: `GET /api/content/roi-industries`
- **Response Sample**:
```json
{
  "data": [
    {
      "id": "roi_1",
      "name": "E-Commerce",
      "roiPercentage": "45%",
      "roiLabel": "Increase in conversion",
      "useCases": ["Cart Recovery", "Order Support"]
    }
  ]
}
```

### 5. Automation Engines
Deep dive into the underlying technology blocks.
- **Endpoint**: `GET /api/content/automation-engines`
- **Response Sample**:
```json
{
  "data": [
    {
      "tag": "LATENCY",
      "title": "Sub-200ms Response Time",
      "ctaLabel": "View Tech Spec",
      "ctaLink": "/docs",
      "image": "https://...",
      "bulletPoints": ["Global edge nodes", "Optimized inference"]
    }
  ]
}
```

### 6. Capabilities (Grid)
High-level feature grid (usually 3 columns).
- **Endpoint**: `GET /api/content/capabilities`
- **Response Sample**:
```json
{
  "data": [
    { "column": "left", "title": "Scalable Infrastructure", "description": "...", "icon": "cpu", "sortOrder": 1 }
  ]
}
```

### 7. Process Steps
"How it works" or "Get started in 3 steps".
- **Endpoint**: `GET /api/content/process-steps`
- **Response Sample**:
```json
{
  "data": [
    { "stepNumber": 1, "title": "Connect Data", "description": "Integrate your CRM...", "sortOrder": 1 }
  ]
}
```

### 8. Product Features (Deep Dive)
Detailed features with rich descriptions.
- **Endpoint**: `GET /api/content/product-features`
- **Response Sample**:
```json
{
  "data": [
    { "title": "Self-Correcting AI", "description": "Learns from every...", "image": "...", "sortOrder": 1 }
  ]
}
```

### 9. Partners
Logo wall of current clients or technology partners.
- **Endpoint**: `GET /api/content/partners`
- **Response Sample**:
```json
{
  "data": [
    { "name": "Google Cloud", "logoSvg": "<svg>...</svg>", "sortOrder": 1 }
  ]
}
```

---

## 3. Trust & Support

### 1. Testimonials
Quotes and social proof from happy customers.
- **Endpoint**: `GET /api/content/testimonials`
- **Response Sample**:
```json
{
  "data": [
    {
      "authorName": "Jane Doe",
      "authorRole": "CTO at TechCorp",
      "authorAvatar": "https://...",
      "companyLogo": "https://...",
      "content": "Deepdale transformed our support desk."
    }
  ]
}
```

### 2. Caller Showcase
Profiles of AI or human agents featured on the site.
- **Endpoint**: `GET /api/content/callers`
- **Response Sample**:
```json
{
  "data": [
    { "name": "Agent Sarah", "role": "Senior Consultant", "avatarImage": "https://..." }
  ]
}
```

### 3. FAQ
Categorized questions and answers.
- **Endpoint**: `GET /api/content/faq`
- **Response Sample**:
```json
{
  "data": [
    {
      "label": "General",
      "items": [
        { "question": "What is Deepdale?", "answer": "It is an AI platform..." }
      ]
    }
  ]
}
```

### 4. Integrations
Logos of software that integrates with Deepdale.
- **Endpoint**: `GET /api/content/integrations`
- **Response Sample**:
```json
{
  "data": [
    { "name": "Slack", "logoUrl": "...", "row": 1, "sortOrder": 1 }
  ]
}
```

### 5. Support Form (Lead Generation)
Config for the "Contact Us" or "Get a Demo" form.
- **Endpoint**: `GET /api/content/support-form`
- **Response Sample**:
```json
{
  "data": {
    "heading": "Let's build together",
    "subheading": "Get a custom demo today.",
    "checkItems": ["No credit card required", "Instant setup"],
    "submitButtonText": "Schedule Call",
    "successMessage": "We will be in touch soon!",
    "privacyPolicyText": "View privacy policy",
    "privacyPolicyUrl": "/privacy"
  }
}
```

---

## 4. Layout & SEO

### Footer
Links, tagline, and brand identity at the bottom.
- **Endpoint**: `GET /api/content/footer`
- **Response Sample**:
```json
{
  "data": {
    "footerTagline": "Leading the Voice AI Revolution",
    "footerBrandText": "Deepdale",
    "linkGroups": [
      {
        "title": "Company",
        "links": [{ "label": "About", "href": "/about" }]
      }
    ]
  }
}
```

### Rating Summary
General star ratings (e.g., G2, Trustpilot).
- **Endpoint**: `GET /api/content/rating-summary`
- **Response Sample**:
```json
{
  "data": { "avgRating": 4.9, "totalReviews": 1250, "platformName": "Trustpilot" }
}
```

### Section Visibility (Config)
A central list to know which sections are turned ON or OFF in the admin dashboard.
- **Endpoint**: `GET /api/content/section-config` (or check `sectionStates` in `/home`)
- **Response Sample**:
```json
{
  "data": [
    { "key": "HERO_SECTION", "isVisible": true },
    { "key": "PARTNERSHIP_SECTION", "isVisible": false }
  ]
}
```

---

## 5. Preview Mode
To see **draft** or **hidden** content exactly like in the admin dashboard, append `?previewToken=YOUR_TOKEN` to any GET request.

**Example**: `GET /api/content/hero?previewToken=abc-123`
