"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreviewToken = createPreviewToken;
exports.verifyPreviewToken = verifyPreviewToken;
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
const PREVIEW_TOKEN_TTL_MINUTES = 30;
function signPreviewToken(encodedPayload) {
    return (0, node_crypto_1.createHmac)("sha256", env_1.env.SESSION_SECRET)
        .update(encodedPayload)
        .digest("base64url");
}
function createPreviewToken(input) {
    const exp = Date.now() + PREVIEW_TOKEN_TTL_MINUTES * 60 * 1000;
    const payload = {
        userId: input.userId,
        role: input.role,
        exp
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = signPreviewToken(encodedPayload);
    return {
        token: `${encodedPayload}.${signature}`,
        requestedByUserId: input.userId,
        role: input.role,
        expiresAt: new Date(exp).toISOString()
    };
}
function verifyPreviewToken(token) {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
        return null;
    }
    const expectedSignature = signPreviewToken(encodedPayload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(providedSignature);
    if (expectedBuffer.length !== providedBuffer.length ||
        !(0, node_crypto_1.timingSafeEqual)(expectedBuffer, providedBuffer)) {
        return null;
    }
    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
        if (!payload.userId ||
            !payload.role ||
            typeof payload.exp !== "number" ||
            payload.exp <= Date.now()) {
            return null;
        }
        return {
            requestedByUserId: payload.userId,
            role: payload.role,
            expiresAt: new Date(payload.exp).toISOString()
        };
    }
    catch {
        return null;
    }
}
