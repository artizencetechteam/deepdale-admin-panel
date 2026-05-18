# Deepdale Backend

Backend-first CMS API for Deepdale marketing content, admin operations, chat configuration, and lead intake.

## Stack

- Node 24
- TypeScript
- Express
- Prisma
- PostgreSQL
- Zod

## Setup

1. Copy `.env.example` to `.env` and set a reachable `DATABASE_URL`.
2. Install dependencies with `pnpm install`.
3. Generate Prisma client with `pnpm prisma:generate`.
4. Create or refresh the initial SQL migration with `pnpm prisma:migrate:diff`.
5. Apply the generated SQL to PostgreSQL using your preferred migration workflow.
6. Seed the database with `pnpm prisma:seed`.
7. Write the current OpenAPI artifact with `pnpm openapi:write`.
8. Start the API with `pnpm dev`.

## Core routes

- `GET /`
- `GET /health`
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `GET /api/admin/dashboard/overview`
- `GET /api/content/home`
- `POST /api/content/leads`
- `POST /api/content/chat`
- `GET /openapi.json`

## Notes

- Public endpoints never expose `chatSystemPrompt`.
- Admin mutating routes require both a valid session and a CSRF token.
- Local uploads are served from `/uploads/*`.
- `pnpm openapi:write` snapshots the current API contract to `docs/openapi.json`.
- Frontend integration guidance lives in `docs/FRONTEND_API_INTEGRATION.md`.
- Seeded image/logo content uses self-contained SVG data URLs, so seeded public content does not depend on missing local asset files.
