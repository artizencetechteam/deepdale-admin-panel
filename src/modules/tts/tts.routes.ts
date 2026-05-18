import { Router } from "express";
import { z } from "zod";

import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { getOpenAiClient } from "../../lib/openai";
import { requireRole } from "../../middleware/roles";
import { parseWithSchema } from "../../lib/validation";

const ttsPreviewSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  voicePitch: z.number().min(0.5).max(2).optional()
});

async function generateSpeech(text: string): Promise<Buffer> {
  if (env.TTS_PROVIDER !== "openai") {
    throw new AppError(503, "tts_not_configured", "TTS provider is disabled");
  }

  const client = getOpenAiClient();

  if (!client) {
    throw new AppError(
      503,
      "tts_not_configured",
      "TTS provider is not configured"
    );
  }

  const speech = await client.audio.speech.create({
    model: env.OPENAI_TTS_MODEL,
    voice: env.OPENAI_TTS_VOICE,
    input: text,
    response_format: "mp3"
  });
  const arrayBuffer = await speech.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

export function createTtsRouter(): Router {
  const router = Router();

  router.use(requireRole("editor", "admin", "superadmin"));

  router.post("/preview/voice-scenario", async (request, response) => {
    const input = parseWithSchema(ttsPreviewSchema, request.body);
    const audio = await generateSpeech(input.text);

    response.type("audio/mpeg").send(audio);
  });

  router.post("/preview/caller", async (request, response) => {
    const input = parseWithSchema(ttsPreviewSchema, request.body);
    const audio = await generateSpeech(input.text);

    response.type("audio/mpeg").send(audio);
  });

  return router;
}
