import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai';
import { recordActivity } from '@/lib/activity';
import { getDocument } from '@/lib/docStore';
import { getEmbeddingProvider, VectorStore } from '@/lib/rag';
import { checkRateLimit, clientIp, sanitizeText } from '@/lib/validators';

const MAX_QUESTION_CHARS = 2000;
const TOP_K = 5;
const MAX_CHUNKS = 200;

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
    const { id, question, chunks: clientChunks } = body ?? {};

    if (typeof id !== 'string' || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Document id and question are required.' },
        { status: 400 },
      );
    }

    const cleanQuestion = sanitizeText(question, MAX_QUESTION_CHARS);
    const doc = getDocument(id);

    let context: string;
    let retrievedCount = 0;

    if (doc && doc.vectors.size > 0) {
      const embeddings = getEmbeddingProvider();
      const [queryVector] = await embeddings.embed([cleanQuestion]);
      const relevant = doc.vectors.search(queryVector, TOP_K);
      context = relevant.map((entry) => entry.text).join('\n\n');
      retrievedCount = relevant.length;
    } else if (
      Array.isArray(clientChunks) &&
      clientChunks.length > 0 &&
      clientChunks.length <= MAX_CHUNKS &&
      clientChunks.every((chunk) => typeof chunk === 'string')
    ) {
      const chunks = clientChunks.map((chunk) => sanitizeText(chunk, 5000));
      const embeddings = getEmbeddingProvider();
      const chunkVectors = await embeddings.embed(chunks);
      const store = new VectorStore();
      store.add(
        chunks.map((chunk, index) => ({
          id: `client-${index}`,
          text: chunk,
          vector: chunkVectors[index],
        })),
      );
      const [queryVector] = await embeddings.embed([cleanQuestion]);
      const relevant = store.search(queryVector, TOP_K);
      context = relevant.map((entry) => entry.text).join('\n\n');
      retrievedCount = relevant.length;
    } else if (doc) {
      context = doc.text;
    } else {
      return NextResponse.json(
        { error: 'Document not found or session expired. Please re-upload the file.' },
        { status: 404 },
      );
    }

    const provider = getProvider();
    const system = `You answer questions using ONLY the provided document excerpts (retrieved via RAG). If the answer is not present in the excerpts, respond exactly: "The document does not contain information to answer this question." Do not use outside knowledge or invent details.`;

    const answer = await provider.complete(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Document excerpts:\n"""\n${context}\n"""\n\nQuestion: ${cleanQuestion}`,
        },
      ],
      { temperature: 0.2, maxTokens: 1600 },
    );

    recordActivity('documents', 'Document Q&A (RAG)', 'success', doc?.filename ?? 'stateless');
    return NextResponse.json({
      answer,
      filename: doc?.filename ?? null,
      retrievedCount,
      provider: provider.id,
      model: provider.lastUsedModel,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    recordActivity('documents', 'Document Q&A (RAG)', 'error');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: `AI service error: ${message}` }, { status: 502 });
  }
}
