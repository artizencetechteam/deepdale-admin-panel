"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function log(level, message, extra) {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    if (extra === undefined) {
        console[level](prefix, message);
        return;
    }
    console[level](prefix, message, extra);
}
exports.logger = {
    info(message, extra) {
        log("info", message, extra);
    },
    warn(message, extra) {
        log("warn", message, extra);
    },
    error(message, extra) {
        log("error", message, extra);
    }
};
