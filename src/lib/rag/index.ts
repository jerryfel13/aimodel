import {
  DemoEmbeddings,
  OpenAICompatibleEmbeddings,
} from './embeddings';
import type { EmbeddingProvider } from './embeddings';

export * from './embeddings';
export * from './vectorStore';
export * from './chunk';

let cached: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached;

  const embeddingKey = process.env.EMBEDDING_API_KEY ?? '';
  const chatKey = process.env.OPENAI_API_KEY ?? '';
  const chatBase = process.env.OPENAI_BASE_URL ?? '';

  if (embeddingKey) {
    const baseURL = process.env.EMBEDDING_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    cached = new OpenAICompatibleEmbeddings(baseURL, embeddingKey, model);
  } else if (chatKey && chatBase) {
    const model =
      process.env.EMBEDDING_MODEL ||
      (chatBase.includes('openrouter')
        ? 'openai/text-embedding-3-small'
        : 'text-embedding-3-small');
    cached = new OpenAICompatibleEmbeddings(chatBase, chatKey, model);
  } else if (chatKey) {
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    cached = new OpenAICompatibleEmbeddings(
      'https://api.openai.com/v1',
      chatKey,
      model,
    );
  } else {
    cached = new DemoEmbeddings();
  }

  return cached;
}
