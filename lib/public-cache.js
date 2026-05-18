"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicContentCache = void 0;
const cache_1 = require("./cache");
exports.publicContentCache = new cache_1.TtlCache(60_000);
