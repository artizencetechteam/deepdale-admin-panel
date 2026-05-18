import OpenAI from "openai";

import { env } from "../config/env";

let singletonClient: OpenAI | null = null;

export function getOpenAiClient(): OpenAI | null {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  if (!singletonClient) {
    singletonClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || undefined
    });
  }

  return singletonClient;
}
