# Full Internal & Admin API Documentation

This directory already contained a high-level `API_REFERENCE.md`. Below is a supplemental technical index mapping out the specific internals of the Admin (CMS) capabilities, reflecting what handlers currently exist, as well as outlining features that still need API creations for full scale.

## Core Admin Router Collections
All routes below are namespaced under: `POST/GET/PUT/PATCH/DELETE /api/admin/*`
All write operations mandate:
1. Cookie-based Session Auth
2. `x-csrf-token` matching the session CSRF hash.

| Domain Engine | Endpoints (`/api/admin/...`) | Responsible for |
| :--- | :--- | :--- |
| **Auth** | `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/csrf` | Provider auth & CSRF token negotiation. |
| **Meta** | `/meta/ui-options` | Feeds available Icon strings and CSS Gradient presets to Admin panel. |
| **Dashboard** | `/dashboard/overview` | Feeds the dashboard UI statistics, draft sizes, and recent Activity Logs (depending on RBAC). |
| **Preview** | `/preview/session` | Secures & generates short-lived tokens to pipe unpublished drafts to frontend previews. |
| **Leads** | `/leads`, `/leads/:id`, `/leads/export.csv` | CRM functionality. Supports searching, filtering, marking "contacted", and CSV exports. |
| **Media** | `/media`, `/media/upload`, `/media/:id` | Handles Multer buffering, sizing, MIME locking, and S3/Local push. |
| **TTS** | `/tts/preview/voice-scenario`, `/tts/preview/caller` | Proxy to OpenAI for generating text-to-speech `.mp3` buffers. |
| **Users** | `/users`, `/users/:id/set-password` | Internal RBAC control exclusively restricted to `superadmin`. |
| **Activity**| `/activity-log` | Audit history tracking who modified what content, IP tracking. |

## Content CMS Domain Generators
The CMS dynamically mounts identical structured endpoints for 20+ different primitives under `/api/admin/*`:

- **Collections** (`/products`, `/voice-scenarios`, `/testimonials`, `/callers`, `/faqs`, etc.):
  - `GET /` -> List all
  - `GET /:id` -> View single
  - `POST /` -> Create
  - `PUT /:id` -> Full update
  - `DELETE /:id` -> Trash
  - `PATCH /reorder` -> Mass array update indexing `sortOrder`
  - `PATCH /:id/publication-status` -> Swap visibility between `draft` and `published`

- **Singletons** (`/site-settings`, `/section-config`, `/hero`, `/rating-summary`):
  - `GET /` -> Retrieve singleton properties
  - `PUT /` -> Update singleton properties in bulk

## Remaining APIs to Create (Future Architectural Evolution)

While Deepdale's core backend is 100% complete per current schemas, here are the APIs that will need creating when enterprise scaling occurs:

1. **API Keys / Programmatic Access**:
   - `POST /api/admin/apikeys`
   - Create system machine-tokens for programmatic injection of content via CI/CD.

2. **Webhooks / Event Emitters**:
   - `POST /api/admin/webhooks`
   - Configures endpoints to hit when `LeadSubmission` triggers occur (e.g. hitting Zapier).

3. **Soft Delete Restoration**:
   - `POST /api/admin/trash/restore/:id`
   - Allows editors to undelete items accidentally removed. Currently, deletes cascade permanently in Prisma.

4. **Analytics Telemetry Ingest**:
   - `POST /api/content/telemetry/view` (Public)
   - Push analytics of which UI sections were viewed for how many seconds, providing real data to the "ROI" dashboard.

5. **A/B Testing Content**:
   - Creating schemas for `HeroVariantA` vs `HeroVariantB` and serving them dynamically via the `/home` public endpoint based on tracking cookies.
