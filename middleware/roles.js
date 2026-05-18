"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const errors_1 = require("../lib/errors");
function requireRole(...allowedRoles) {
    return (request, _response, next) => {
        const role = request.auth?.role;
        if (!role || !allowedRoles.includes(role)) {
            next(new errors_1.AppError(403, "forbidden", "You do not have permission for this action"));
            return;
        }
        next();
    };
}
