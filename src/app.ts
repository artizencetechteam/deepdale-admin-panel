import express, { Router } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";

import { env } from "./config/env";
import { attachAuth, requireAuth } from "./middleware/auth";
import { globalRateLimit } from "./middleware/rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { createAuthRouter } from "./modules/auth/auth.routes";
import { createUsersRouter } from "./modules/users/users.routes";
import { createDashboardRouter } from "./modules/dashboard/dashboard.routes";
import { createMediaRouter } from "./modules/media/media.routes";
import { createAdminContentRouter } from "./modules/content/admin-content.routes";
import { createLeadsRouter } from "./modules/leads/leads.routes";
import { createActivityLogRouter } from "./modules/activity/activity.routes";
import { createPublicContentRouter } from "./modules/public/public-content.routes";
import { createTtsRouter } from "./modules/tts/tts.routes";
import { createPreviewRouter } from "./modules/preview/preview.routes";
import { openApiDocument } from "./openapi";
import { GRADIENT_PRESETS } from "./constants/gradient-presets";
import { KNOWN_ICON_NAMES } from "./constants/icons";
import { requireRole } from "./middleware/roles";
import { AppError } from "./lib/errors";

export function createApp() {
  const app = express();
  const adminRouter = Router();
  const adminDistPath = path.resolve("dist", "admin");
  const adminIndexPath = path.join(adminDistPath, "index.html");

  app.use(globalRateLimit);
  app.use(
    cors({
      origin(origin, callback) {
        // If no origin (like server-to-server or mobile apps), allow or forbid based on environment
        if (!origin) {
          // Many browsers leave off Origin headers for same-origin or GET requests.
          // By returning callback(null, true) we implicitly allow those through CORS,
          // though CSRF and Auth will still protect state-changing requests.
          callback(null, true);
          return;
        }

        // Normalize origin by removing trailing slash for comparison
        const normalizedOrigin = origin.replace(/\/$/, "");
        const isAllowed = env.corsOrigins.some(
          (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
        );

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(
            new AppError(
              403, 
              "cors_origin_denied", 
              `Origin ${origin} not allowed by CORS. Allowed: ${env.corsOrigins.join(", ")}`
            )
          );
        }
      },
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(attachAuth);
  app.use(express.static(path.resolve(__dirname, "../public")));
  app.use(
    "/uploads",
    express.static(path.resolve(env.UPLOAD_DIR), {
      setHeaders(response) {
        // Uploaded media is loaded by the admin UI and public frontend, which
        // run on different origins than the API. helmet() defaults CORP to
        // "same-origin", which makes browsers refuse to render these as
        // cross-origin <img>/<audio>. Relax it for static media only.
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      }
    })
  );

  app.get("/", (_request, response) => {
    response.json({
      data: {
        service: "deepdale-backend",
        status: "ok",
        environment: env.NODE_ENV,
        docsUrl: "/openapi.json",
        healthUrl: "/health",
        publicApiBase: "/api/content",
        adminApiBase: "/api/admin"
      }
    });
  });

  app.get("/health", (_request, response) => {
    response.json({
      data: {
        status: "ok",
        environment: env.NODE_ENV,
        uptimeSeconds: Math.round(process.uptime())
      }
    });
  });

  app.get("/openapi.json", (_request, response) => {
    response.json(openApiDocument);
  });

  app.use("/api/admin/auth", createAuthRouter());

  adminRouter.use(requireAuth);
  adminRouter.get(
    "/meta/ui-options",
    requireRole("viewer", "editor", "admin", "superadmin"),
    (_request, response) => {
      response.json({
        data: {
          gradientPresets: GRADIENT_PRESETS,
          iconNames: KNOWN_ICON_NAMES
        }
      });
    }
  );
  adminRouter.use("/users", createUsersRouter());
  adminRouter.use("/dashboard", createDashboardRouter());
  adminRouter.use("/media", createMediaRouter());
  adminRouter.use("/leads", createLeadsRouter());
  adminRouter.use("/activity-log", createActivityLogRouter());
  adminRouter.use("/tts", createTtsRouter());
  adminRouter.use("/preview", createPreviewRouter());
  adminRouter.use("/", createAdminContentRouter());

  app.use("/api/admin", adminRouter);
  app.use("/api/content", createPublicContentRouter());

  if (fs.existsSync(adminIndexPath)) {
    app.use(
      "/admin/assets",
      express.static(path.join(adminDistPath, "assets"), {
        index: false
      })
    );
    app.get(/^\/admin(?:\/.*)?$/, (_request, response) => {
      response.sendFile(adminIndexPath);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
