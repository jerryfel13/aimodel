export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface ColumnStat {
  name: string;
  type: 'number' | 'string';
  count: number;
  missing: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  unique?: number;
  topValues?: { value: string; count: number }[];
}

export interface DataStats {
  format: 'csv' | 'json';
  rowCount: number;
  columns: ColumnStat[];
}

export interface InsightResult {
  observations: string[];
  recommendations: string[];
}

export interface DocumentSection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
}

export interface DocumentContent {
  title: string;
  sections: DocumentSection[];
}

export interface SpreadsheetSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface SpreadsheetData {
  sheets: SpreadsheetSheet[];
}

export interface ImageResult {
  base64: string;
  mimeType: string;
}

export interface LLMProvider {
  readonly id: string;
  readonly label: string;
  readonly isDemo: boolean;
  readonly lastUsedModel?: string;
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  analyzeDocument(text: string, filename: string): Promise<DocumentAnalysis>;
  generateInsights(stats: DataStats): Promise<InsightResult>;
  generateContent(contentType: string, topic: string, tone: string, length: string): Promise<string>;
  generateDocument(prompt: string): Promise<DocumentContent>;
  generateSpreadsheet(prompt: string): Promise<SpreadsheetData>;
  generateImage(prompt: string): Promise<ImageResult>;
}
