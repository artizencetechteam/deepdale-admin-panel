import { Router } from "express";

import { env } from "../../config/env";
import { createPreviewToken } from "../../lib/preview";
import { requireRole } from "../../middleware/roles";

function buildPreviewUrl(pathname: string, token: string) {
  const baseUrl = new URL(pathname, env.APP_BASE_URL);
  baseUrl.searchParams.set("previewToken", token);
  return {
    path: `${pathname}?previewToken=${encodeURIComponent(token)}`,
    absoluteUrl: baseUrl.toString()
  };
}

export function createPreviewRouter(): Router {
  const router = Router();

  router.get(
    "/session",
    requireRole("viewer", "editor", "admin", "superadmin"),
    (request, response) => {
      const previewSession = createPreviewToken({
        userId: request.auth!.userId,
        role: request.auth!.role
      });

      response.json({
        data: {
          token: previewSession.token,
          expiresAt: previewSession.expiresAt,
          requestedByUserId: previewSession.requestedByUserId,
          endpoints: [
            {
              key: "home",
              label: "Landing page payload",
              ...buildPreviewUrl("/api/content/home", previewSession.token)
            },
            {
              key: "navigation",
              label: "Header and navigation",
              ...buildPreviewUrl("/api/content/navigation", previewSession.token)
            },
            {
              key: "footer",
              label: "Footer payload",
              ...buildPreviewUrl("/api/content/footer", previewSession.token)
            }
          ]
        }
      });
    }
  );

  return router;
}
