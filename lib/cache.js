"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtlCache = void 0;
class TtlCache {
    ttlMs;
    store = new Map();
    constructor(ttlMs) {
        this.ttlMs = ttlMs;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value) {
        this.store.set(key, { expiresAt: Date.now() + this.ttlMs, value });
    }
    invalidate(key) {
        this.store.delete(key);
    }
    invalidatePrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
    }
}
exports.TtlCache = TtlCache;
