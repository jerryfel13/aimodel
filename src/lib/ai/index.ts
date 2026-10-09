import { DemoProvider } from './demo';
import { OpenAIProvider } from './openai';
import type { LLMProvider } from './types';

export * from './types';

let cached: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (cached) return cached;

  const mode = process.env.AI_MODE ?? 'auto';
  const apiKey = process.env.OPENAI_API_KEY ?? '';

  if (mode !== 'demo' && apiKey) {
    const baseURL = process.env.OPENAI_BASE_URL || undefined;
    const fallbacks = (process.env.OPENAI_FALLBACK_MODELS ?? '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const imageModel = process.env.OPENAI_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
    cached = new OpenAIProvider(
      apiKey,
      process.env.OPENAI_MODEL || 'gpt-4o-mini',
      baseURL,
      fallbacks,
      imageModel,
    );
  } else {
    cached = new DemoProvider();
  }

  return cached;
}
