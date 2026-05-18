"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("./config/env");
const auth_1 = require("./middleware/auth");
const error_handler_1 = require("./middleware/error-handler");
const auth_routes_1 = require("./modules/auth/auth.routes");
const users_routes_1 = require("./modules/users/users.routes");
const dashboard_routes_1 = require("./modules/dashboard/dashboard.routes");
const media_routes_1 = require("./modules/media/media.routes");
const admin_content_routes_1 = require("./modules/content/admin-content.routes");
const leads_routes_1 = require("./modules/leads/leads.routes");
const activity_routes_1 = require("./modules/activity/activity.routes");
const public_content_routes_1 = require("./modules/public/public-content.routes");
const tts_routes_1 = require("./modules/tts/tts.routes");
const preview_routes_1 = require("./modules/preview/preview.routes");
const openapi_1 = require("./openapi");
const gradient_presets_1 = require("./constants/gradient-presets");
const icons_1 = require("./constants/icons");
const roles_1 = require("./middleware/roles");
const errors_1 = require("./lib/errors");
function createApp() {
    const app = (0, express_1.default)();
    const adminRouter = (0, express_1.Router)();
    const adminDistPath = node_path_1.default.resolve("dist", "admin");
    const adminIndexPath = node_path_1.default.join(adminDistPath, "index.html");
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            if (!origin || env_1.env.corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new errors_1.AppError(403, "cors_origin_denied", "Origin not allowed by CORS"));
        },
        credentials: true
    }));
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json({ limit: "2mb" }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use(auth_1.attachAuth);
    app.use("/uploads", express_1.default.static(node_path_1.default.resolve(env_1.env.UPLOAD_DIR)));
    app.get("/", (_request, response) => {
        response.json({
            data: {
                service: "deepdale-backend",
                status: "ok",
                environment: env_1.env.NODE_ENV,
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
                environment: env_1.env.NODE_ENV,
                uptimeSeconds: Math.round(process.uptime())
            }
        });
    });
    app.get("/openapi.json", (_request, response) => {
        response.json(openapi_1.openApiDocument);
    });
    app.use("/api/admin/auth", (0, auth_routes_1.createAuthRouter)());
    adminRouter.use(auth_1.requireAuth);
    adminRouter.get("/meta/ui-options", (0, roles_1.requireRole)("viewer", "editor", "admin", "superadmin"), (_request, response) => {
        response.json({
            data: {
                gradientPresets: gradient_presets_1.GRADIENT_PRESETS,
                iconNames: icons_1.KNOWN_ICON_NAMES
            }
        });
    });
    adminRouter.use("/users", (0, users_routes_1.createUsersRouter)());
    adminRouter.use("/dashboard", (0, dashboard_routes_1.createDashboardRouter)());
    adminRouter.use("/media", (0, media_routes_1.createMediaRouter)());
    adminRouter.use("/leads", (0, leads_routes_1.createLeadsRouter)());
    adminRouter.use("/activity-log", (0, activity_routes_1.createActivityLogRouter)());
    adminRouter.use("/tts", (0, tts_routes_1.createTtsRouter)());
    adminRouter.use("/preview", (0, preview_routes_1.createPreviewRouter)());
    adminRouter.use("/", (0, admin_content_routes_1.createAdminContentRouter)());
    app.use("/api/admin", adminRouter);
    app.use("/api/content", (0, public_content_routes_1.createPublicContentRouter)());
    if (node_fs_1.default.existsSync(adminIndexPath)) {
        app.use("/admin/assets", express_1.default.static(node_path_1.default.join(adminDistPath, "assets"), {
            index: false
        }));
        app.get(/^\/admin(?:\/.*)?$/, (_request, response) => {
            response.sendFile(adminIndexPath);
        });
    }
    app.use(error_handler_1.notFoundHandler);
    app.use(error_handler_1.errorHandler);
    return app;
}
