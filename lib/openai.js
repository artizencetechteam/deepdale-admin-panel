"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAiClient = getOpenAiClient;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
let singletonClient = null;
function getOpenAiClient() {
    if (!env_1.env.OPENAI_API_KEY) {
        return null;
    }
    if (!singletonClient) {
        singletonClient = new openai_1.default({
            apiKey: env_1.env.OPENAI_API_KEY,
            baseURL: env_1.env.OPENAI_BASE_URL || undefined
        });
    }
    return singletonClient;
}
