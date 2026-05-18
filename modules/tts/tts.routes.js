"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTtsRouter = createTtsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const openai_1 = require("../../lib/openai");
const roles_1 = require("../../middleware/roles");
const validation_1 = require("../../lib/validation");
const ttsPreviewSchema = zod_1.z.object({
    text: zod_1.z.string().trim().min(1).max(5000),
    voicePitch: zod_1.z.number().min(0.5).max(2).optional()
});
async function generateSpeech(text) {
    if (env_1.env.TTS_PROVIDER !== "openai") {
        throw new errors_1.AppError(503, "tts_not_configured", "TTS provider is disabled");
    }
    const client = (0, openai_1.getOpenAiClient)();
    if (!client) {
        throw new errors_1.AppError(503, "tts_not_configured", "TTS provider is not configured");
    }
    const speech = await client.audio.speech.create({
        model: env_1.env.OPENAI_TTS_MODEL,
        voice: env_1.env.OPENAI_TTS_VOICE,
        input: text,
        response_format: "mp3"
    });
    const arrayBuffer = await speech.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
function createTtsRouter() {
    const router = (0, express_1.Router)();
    router.use((0, roles_1.requireRole)("editor", "admin", "superadmin"));
    router.post("/preview/voice-scenario", async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(ttsPreviewSchema, request.body);
        const audio = await generateSpeech(input.text);
        response.type("audio/mpeg").send(audio);
    });
    router.post("/preview/caller", async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(ttsPreviewSchema, request.body);
        const audio = await generateSpeech(input.text);
        response.type("audio/mpeg").send(audio);
    });
    return router;
}
