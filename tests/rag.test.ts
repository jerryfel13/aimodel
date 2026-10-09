import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../src/lib/rag/chunk.ts';
import { cosineSimilarity, VectorStore } from '../src/lib/rag/vectorStore.ts';
import { DemoEmbeddings } from '../src/lib/rag/embeddings.ts';

test('chunkText splits long text into overlapping chunks', () => {
  const text = 'This is a test sentence. '.repeat(100);
  const chunks = chunkText(text, 500, 50);
  assert.ok(chunks.length > 1, 'expected multiple chunks');
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 600, `chunk too long: ${chunk.length}`);
  }
});

test('chunkText returns a single chunk for short text', () => {
  const chunks = chunkText('Short text.', 1200, 200);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], 'Short text.');
});

test('vector store ranks the most similar entry first', async () => {
  const embeddings = new DemoEmbeddings();
  const texts = [
    'The project deadline is August 1.',
    'Marketing budget allocation for Q3.',
    'Customer satisfaction survey results.',
  ];
  const vectors = await embeddings.embed(texts);

  const store = new VectorStore();
  store.add(
    texts.map((text, index) => ({
      id: String(index),
      text,
      vector: vectors[index],
    })),
  );

  const [queryVector] = await embeddings.embed(['project deadline']);
  const results = store.search(queryVector, 2);
  assert.equal(results[0].text, texts[0]);
});

test('cosine similarity of identical vectors is 1', () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});

test('cosine similarity of orthogonal vectors is 0', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('demo embeddings produce normalized vectors', async () => {
  const embeddings = new DemoEmbeddings();
  const [vector] = await embeddings.embed(['hello world hello']);
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9, `not normalized: ${norm}`);
  assert.equal(vector.length, embeddings.dimensions);
});
