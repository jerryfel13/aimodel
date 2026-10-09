export interface VectorEntry {
  id: string;
  text: string;
  vector: number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  add(entries: VectorEntry[]): void {
    this.entries.push(...entries);
  }

  search(queryVector: number[], topK: number): VectorEntry[] {
    return this.entries
      .map((entry) => ({
        entry,
        score: cosineSimilarity(queryVector, entry.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((result) => result.entry);
  }

  get size(): number {
    return this.entries.length;
  }
}
