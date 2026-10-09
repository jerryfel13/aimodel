import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai';
import { recordActivity } from '@/lib/activity';
import {
  ALLOWED_EXTENSIONS,
  extractText,
  getExtension,
  MAX_DOCUMENT_BYTES,
  MAX_EXTRACTED_CHARS,
} from '@/lib/documents';
import { storeDocument } from '@/lib/docStore';
import { chunkText, getEmbeddingProvider, VectorStore } from '@/lib/rag';
import { checkRateLimit, clientIp } from '@/lib/validators';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const limit = checkRateLimit(`documents:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { filename, contentBase64 } = body ?? {};

    if (typeof filename !== 'string' || typeof contentBase64 !== 'string') {
      return NextResponse.json(
        { error: 'filename and contentBase64 are required.' },
        { status: 400 },
      );
    }

    const ext = getExtension(filename);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or TXT file.' },
        { status: 400 },
      );
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(contentBase64, 'base64');
    } catch {
      return NextResponse.json({ error: 'Could not decode the uploaded file.' }, { status: 400 });
    }

    if (buffer.length === 0 || buffer.length > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { error: `File must be between 1 byte and ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.` },
        { status: 400 },
      );
    }

    const rawText = await extractText(filename, buffer);
    const text = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRACTED_CHARS);

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract readable text from this file. Try a different document.' },
        { status: 422 },
      );
    }

    const id = randomUUID();

    const chunks = chunkText(text);
    const vectors = new VectorStore();
    try {
      const embeddings = getEmbeddingProvider();
      const chunkVectors = await embeddings.embed(chunks);
      vectors.add(
        chunks.map((chunk, index) => ({
          id: `${id}-${index}`,
          text: chunk,
          vector: chunkVectors[index],
        })),
      );
    } catch {
      recordActivity('documents', 'Embedding failed - using full-text fallback', 'error');
    }

    storeDocument(id, filename, text, chunks, vectors);

    const provider = getProvider();
    const analysis = await provider.analyzeDocument(text, filename);

    recordActivity('documents', 'Document analysis', 'success', filename);
    return NextResponse.json({
      id,
      filename,
      charCount: text.length,
      wordCount: text.split(/\s+/).length,
      chunkCount: chunks.length,
      chunks,
      analysis,
      provider: provider.id,
      model: provider.lastUsedModel,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    recordActivity('documents', 'Document analysis', 'error');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: `Document analysis failed: ${message}` }, { status: 502 });
  }
}
