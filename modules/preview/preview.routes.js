"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreviewRouter = createPreviewRouter;
const express_1 = require("express");
const env_1 = require("../../config/env");
const preview_1 = require("../../lib/preview");
const roles_1 = require("../../middleware/roles");
function buildPreviewUrl(pathname, token) {
    const baseUrl = new URL(pathname, env_1.env.APP_BASE_URL);
    baseUrl.searchParams.set("previewToken", token);
    return {
        path: `${pathname}?previewToken=${encodeURIComponent(token)}`,
        absoluteUrl: baseUrl.toString()
    };
}
function createPreviewRouter() {
    const router = (0, express_1.Router)();
    router.get("/session", (0, roles_1.requireRole)("viewer", "editor", "admin", "superadmin"), (request, response) => {
        const previewSession = (0, preview_1.createPreviewToken)({
            userId: request.auth.userId,
            role: request.auth.role
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
    });
    return router;
}
