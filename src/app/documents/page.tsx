'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ListChecks,
  MessageSquareText,
  Send,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/PageHeader';

interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

interface AnalysisResult {
  id: string;
  filename: string;
  charCount: number;
  wordCount: number;
  chunkCount: number;
  chunks: string[];
  analysis: DocumentAnalysis;
  isDemo: boolean;
}

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = ['pdf', 'txt'];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function DocumentsPage() {
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [retrievedCount, setRetrievedCount] = useState(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setAnswer(null);
    setAnswerError(null);
    setChunks([]);

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!ALLOWED.includes(ext)) {
      setError('Unsupported file type. Please upload a PDF or TXT file.');
      return;
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      setError('File must be between 1 byte and 3 MB.');
      return;
    }

    setAnalyzing(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentBase64: arrayBufferToBase64(buffer),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
      setChunks(Array.isArray(data.chunks) ? data.chunks : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const askQuestion = useCallback(async () => {
    const text = question.trim();
    if (!text || !result || answering) return;

    setAnswerError(null);
    setAnswer(null);
    setRetrievedCount(0);
    setAnswering(true);
    try {
      const res = await fetch('/api/documents/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, question: text, chunks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Question failed');
      setAnswer(data.answer);
      setRetrievedCount(data.retrievedCount ?? 0);
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : 'Failed to get an answer.');
    } finally {
      setAnswering(false);
    }
  }, [question, result, answering]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void analyze(file);
    },
    [analyze],
  );

  return (
    <>
      <PageHeader
        title="Document Analyzer"
        description="Upload a PDF or TXT document to summarize it, extract key points and action items, then ask questions about it."
      >
        {result && (
          <Badge variant={result.isDemo ? 'warning' : 'success'}>
            {result.isDemo ? 'Demo mode' : 'OpenAI'}
          </Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload document</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-900">
                  Drag and drop, or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  PDF or TXT only, up to 3 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void analyze(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {error && (
                <div className="mt-4">
                  <Alert type="error" title="Upload failed">
                    {error}
                  </Alert>
                </div>
              )}

              {analyzing && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Spinner /> Extracting text and analyzing document...
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Sample documents</p>
                <div className="space-y-2">
                  <a
                    href="/samples/project_brief.txt"
                    download
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-brand-500" />
                    project_brief.txt
                  </a>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Tip: download the sample, then upload it here to see the analyzer in action.
                </p>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Ask about this document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-3">
                  Answers are grounded in the document via RAG: the question is
                  matched against embedded document sections, and the answer uses
                  only the most relevant sections. If the answer is not in the
                  document, the assistant says so.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void askQuestion();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. What is the project deadline?"
                    disabled={answering}
                    maxLength={2000}
                  />
                  <Button type="submit" disabled={answering || !question.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                {answerError && (
                  <div className="mt-3">
                    <Alert type="error">{answerError}</Alert>
                  </div>
                )}
                {answering && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Spinner className="h-4 w-4" /> Generating answer...
                  </div>
                )}
                  {answer && (
                    <div className="mt-3">
                      {retrievedCount > 0 && (
                        <p className="text-xs text-slate-400 mb-2">
                          Grounded in {retrievedCount} retrieved document section
                          {retrievedCount === 1 ? '' : 's'} (RAG)
                        </p>
                      )}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm whitespace-pre-wrap text-slate-800">
                        {answer}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          {!result && !analyzing ? (
            <EmptyState
              icon={FileText}
              title="No document analyzed yet"
              description="Upload a PDF or TXT file to see the summary, key points, and action items here."
            />
          ) : result ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{result.filename}</CardTitle>
                    <Badge variant="default">
                      {result.wordCount.toLocaleString()} words
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Summary</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {result.analysis.summary}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-brand-500" />
                    Key points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.analysis.keyPoints.length === 0 ? (
                    <p className="text-sm text-slate-500">No key points were identified.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.analysis.keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-amber-500" />
                    Action items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.analysis.actionItems.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No action items were detected in this document.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {result.analysis.actionItems.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Spinner /> Analyzing document...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
