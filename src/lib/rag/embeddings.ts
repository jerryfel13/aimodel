export interface EmbeddingProvider {
  readonly id: string;
  readonly isDemo: boolean;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAICompatibleEmbeddings implements EmbeddingProvider {
  readonly id = 'openai-compatible';
  readonly isDemo = false;
  readonly dimensions: number;

  private baseURL: string;
  private apiKey: string;
  private model: string;

  constructor(
    baseURL: string,
    apiKey: string,
    model = 'text-embedding-3-small',
    dimensions = 1536,
  ) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseURL.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: this.model }),
    });

    if (!res.ok) {
      throw new Error(`Embedding request failed (${res.status})`);
    }

    const json = (await res.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }
}

export class DemoEmbeddings implements EmbeddingProvider {
  readonly id = 'demo';
  readonly isDemo = true;
  readonly dimensions = 256;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.vector(text));
  }

  private vector(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
      }
      vector[hash % this.dimensions] += 1;
    }

    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}
