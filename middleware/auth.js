"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachAuth = attachAuth;
exports.requireAuth = requireAuth;
const errors_1 = require("../lib/errors");
const session_1 = require("../lib/session");
async function attachAuth(request, _response, next) {
    const auth = await (0, session_1.resolveSession)(request);
    if (auth) {
        request.auth = auth;
    }
    else {
        delete request.auth;
    }
    next();
}
function requireAuth(request, _response, next) {
    if (!request.auth) {
        next(new errors_1.AppError(401, "unauthorized", "Authentication required"));
        return;
    }
    next();
}
