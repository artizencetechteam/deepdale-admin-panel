"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCsrf = requireCsrf;
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
function requireCsrf(request, _response, next) {
    const headerToken = request.header("x-csrf-token");
    const cookieToken = request.cookies?.[env_1.env.CSRF_COOKIE_NAME];
    const sessionToken = request.auth?.csrfToken;
    if (!headerToken || !cookieToken || !sessionToken) {
        next(new errors_1.AppError(403, "csrf_missing", "CSRF token is required"));
        return;
    }
    if (headerToken !== cookieToken || headerToken !== sessionToken) {
        next(new errors_1.AppError(403, "csrf_invalid", "Invalid CSRF token"));
        return;
    }
    next();
}
