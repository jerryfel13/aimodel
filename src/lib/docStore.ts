import { VectorStore } from './rag/vectorStore';

interface StoredDocument {
  id: string;
  filename: string;
  text: string;
  chunks: string[];
  vectors: VectorStore;
  expiresAt: number;
}

const store = new Map<string, StoredDocument>();
const TTL_MS = 15 * 60 * 1000;

export function storeDocument(
  id: string,
  filename: string,
  text: string,
  chunks: string[],
  vectors: VectorStore,
): void {
  store.set(id, { id, filename, text, chunks, vectors, expiresAt: Date.now() + TTL_MS });
}

export function getDocument(id: string): StoredDocument | null {
  const doc = store.get(id);
  if (!doc) return null;
  if (Date.now() > doc.expiresAt) {
    store.delete(id);
    return null;
  }
  return doc;
}
