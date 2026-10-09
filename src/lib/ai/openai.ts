import OpenAI, { APIError } from 'openai';
import type {
  DataStats,
  DocumentAnalysis,
  DocumentContent,
  ImageResult,
  InsightResult,
  LLMMessage,
  LLMOptions,
  LLMProvider,
  SpreadsheetData,
} from './types';

function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : trimmed;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai';
  readonly label: string;
  readonly isDemo = false;

  private client: OpenAI;
  private model: string;
  private imageModel: string;
  private fallbackModels: string[];
  private lastModel = '';

  constructor(
    apiKey: string,
    model = 'gpt-4o-mini',
    baseURL?: string,
    fallbackModels: string[] = [],
    imageModel = 'google/gemini-2.5-flash-image',
  ) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    this.model = model;
    this.imageModel = imageModel;
    this.fallbackModels = fallbackModels.filter((m) => m !== this.model);
    this.label = baseURL ? `OpenAI-compatible (${model})` : `OpenAI (${model})`;
  }

  get lastUsedModel(): string {
    return this.lastModel || this.model;
  }

  async complete(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const models = [this.model, ...this.fallbackModels];
    let lastError: unknown = null;

    for (const model of models) {
      try {
        const text = await this.request(model, messages, options);
        this.lastModel = model;
        return text;
      } catch (error) {
        lastError = error;
        if (
          error instanceof APIError &&
          (error.status === 429 || error.status >= 500)
        ) {
          await delay(1500);
          continue;
        }
        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('The AI provider returned an error.');
  }

  private async request(
    model: string,
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      messages,
    });

    const message = completion.choices[0]?.message as
      | { content?: string | null; reasoning?: string | null }
      | undefined;

    const text = message?.content?.trim();
    if (text) return text;

    const reasoning = message?.reasoning?.trim();
    if (reasoning) return reasoning;

    throw new Error('The AI provider returned an empty response.');
  }

  async analyzeDocument(text: string, filename: string): Promise<DocumentAnalysis> {
    const prompt = `Analyze the following document (filename: ${filename}) and respond with ONLY a JSON object matching this schema:
{
  "summary": "A concise 3-5 sentence summary of the document.",
  "keyPoints": ["up to 6 key points as strings"],
  "actionItems": ["up to 6 action items mentioned or implied, as strings; empty array if none"]
}

Document text:
"""
${text.slice(0, 12000)}
"""`;

    const raw = await this.complete(
      [
        { role: 'system', content: 'You are a precise document analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3, maxTokens: 2048 },
    );

    try {
      const parsed = JSON.parse(extractJSON(raw)) as Record<string, unknown>;
      return {
        summary: String(parsed.summary ?? raw),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map(String) : [],
      };
    } catch {
      return { summary: raw, keyPoints: [], actionItems: [] };
    }
  }

  async generateInsights(stats: DataStats): Promise<InsightResult> {
    const prompt = `You are a business data analyst. Below are statistics computed from a client-supplied dataset. Respond with ONLY a JSON object matching this schema:
{
  "observations": ["3-6 factual observations grounded strictly in the statistics below"],
  "recommendations": ["3-5 suggested actions, framed as recommendations to validate, never guarantees"]
}
Do not invent numbers that are not present in the statistics. Do not claim predictive accuracy.

Statistics (JSON):
${JSON.stringify(stats, null, 2)}`;

    const raw = await this.complete(
      [
        { role: 'system', content: 'You are a careful analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.4, maxTokens: 2048 },
    );

    try {
      const parsed = JSON.parse(extractJSON(raw)) as Record<string, unknown>;
      return {
        observations: Array.isArray(parsed.observations) ? parsed.observations.map(String) : [raw],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      };
    } catch {
      return { observations: [raw], recommendations: [] };
    }
  }

  async generateContent(contentType: string, topic: string, tone: string, length: string): Promise<string> {
    const prompt = `Write a ${length} ${contentType} about "${topic}" in a ${tone} tone. Format as clean Markdown. Do not invent specific statistics, names, or financial figures; use placeholders like [X%] or [Name] where specific data would go.`;
    return this.complete(
      [
        { role: 'system', content: 'You are an experienced business content writer.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8, maxTokens: 2400 },
    );
  }

  async generateDocument(prompt: string): Promise<DocumentContent> {
    const system = 'You are a professional business writer. Respond only with valid JSON.';
    const user = `Write a professional document about: "${prompt}". Respond with ONLY a JSON object matching this schema:
{
  "title": "Document title",
  "sections": [
    { "heading": "Section heading", "paragraphs": ["paragraph text"], "bullets": ["bullet text"] }
  ]
}
Use 3-5 sections with 1-2 paragraphs and 2-4 bullets each. Do not invent specific statistics, names, or financial figures; use placeholders like [X%] or [Name] where data would go.`;

    const raw = await this.complete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.7, maxTokens: 2400 },
    );

    try {
      const parsed = JSON.parse(extractJSON(raw)) as Record<string, unknown>;
      const sections = (Array.isArray(parsed.sections) ? parsed.sections : []).map(
        (s) => {
          const section = s as Record<string, unknown>;
          return {
            heading: String(section.heading ?? 'Section'),
            paragraphs: Array.isArray(section.paragraphs)
              ? section.paragraphs.map(String)
              : [],
            bullets: Array.isArray(section.bullets)
              ? section.bullets.map(String)
              : [],
          };
        },
      );
      return { title: String(parsed.title ?? prompt), sections };
    } catch {
      return {
        title: String(prompt),
        sections: [{ heading: 'Document', paragraphs: [raw], bullets: [] }],
      };
    }
  }

  async generateSpreadsheet(prompt: string): Promise<SpreadsheetData> {
    const system = 'You are a data analyst. Respond only with valid JSON.';
    const user = `Create a sample dataset about: "${prompt}". Respond with ONLY a JSON object matching this schema:
{
  "sheets": [
    { "name": "Sheet name", "headers": ["column 1", "column 2"], "rows": [["text value", 123]] }
  ]
}
Generate 8-15 rows of realistic sample data with 4-7 columns, mixing text and numeric columns. Do not use real people, companies, or real data; use clearly fictional sample values.`;

    const raw = await this.complete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.7, maxTokens: 2400 },
    );

    try {
      const parsed = JSON.parse(extractJSON(raw)) as Record<string, unknown>;
      const sheets = (Array.isArray(parsed.sheets) ? parsed.sheets : []).map(
        (s) => {
          const sheet = s as Record<string, unknown>;
          return {
            name: String(sheet.name ?? 'Sheet1').slice(0, 31),
            headers: Array.isArray(sheet.headers) ? sheet.headers.map(String) : [],
            rows: Array.isArray(sheet.rows)
              ? sheet.rows.map((row) =>
                  Array.isArray(row)
                    ? row.map((cell) => (typeof cell === 'number' ? cell : String(cell)))
                    : [],
                )
              : [],
          };
        },
      );
      return { sheets };
    } catch {
      return {
        sheets: [
          {
            name: 'Sheet1',
            headers: ['Prompt'],
            rows: [[raw]],
          },
        ],
      };
    }
  }

  async generateImage(prompt: string): Promise<ImageResult> {
    const completion = await this.client.chat.completions.create({
      model: this.imageModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      modalities: ['text', 'image'],
    } as any);

    const message = completion.choices[0]?.message as
      | {
          content?: string | null;
          images?: { image_url?: { url?: string } | string }[];
        }
      | undefined;

    const images = message?.images;
    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      const url =
        typeof first.image_url === 'string'
          ? first.image_url
          : first.image_url?.url;
      if (url) return this.imageFromUrl(url);
    }

    const content = message?.content ?? '';
    const markdownImage = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
    if (markdownImage) return this.imageFromUrl(markdownImage[1]);

    throw new Error('The image model did not return an image.');
  }

  private async imageFromUrl(url: string): Promise<ImageResult> {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (match) return { base64: match[2], mimeType: match[1] };
      throw new Error('Unsupported image data format from the provider.');
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Could not download the generated image (${res.status}).`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/png';
    return {
      base64: buffer.toString('base64'),
      mimeType: contentType.split(';')[0],
    };
  }
}
