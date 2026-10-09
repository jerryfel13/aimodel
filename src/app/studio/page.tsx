'use client';

import { useState } from 'react';
import {
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import type { LucideIcon } from 'lucide-react';

type StudioType = 'docx' | 'xlsx' | 'image';

interface StudioResult {
  filename: string;
  mimeType: string;
  base64: string;
  model: string;
  isDemo: boolean;
}

interface ToolDef {
  type: StudioType;
  title: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  examples: string[];
}

const TOOLS: ToolDef[] = [
  {
    type: 'docx',
    title: 'Word Document',
    description:
      'Generate a structured .docx document with headings, paragraphs, and bullet lists.',
    icon: FileText,
    placeholder: 'e.g. Project kickoff plan for a website redesign',
    examples: [
      'Project kickoff plan for a website redesign',
      'Meeting summary template for sprint reviews',
      'Onboarding guide for new hires',
    ],
  },
  {
    type: 'xlsx',
    title: 'Excel Spreadsheet',
    description:
      'Generate a sample .xlsx dataset with headers and rows based on your description.',
    icon: FileSpreadsheet,
    placeholder: 'e.g. Sample inventory list for a small retail store',
    examples: [
      'Sample inventory list for a small retail store',
      'Sample employee training tracker',
      'Sample monthly expense report',
    ],
  },
  {
    type: 'image',
    title: 'Image',
    description:
      'Generate an image from a text description (requires an API key with balance).',
    icon: FileImage,
    placeholder: 'e.g. A modern office workspace with plants, flat illustration',
    examples: [
      'A modern office workspace with plants, flat illustration',
      'Abstract gradient background in blue and purple',
      'Simple icon of a rocket launching, minimal style',
    ],
  },
];

function downloadFile(filename: string, mimeType: string, base64: string) {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function StudioPage() {
  const [activeType, setActiveType] = useState<StudioType>('docx');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudioResult | null>(null);

  const activeTool = TOOLS.find((t) => t.type === activeType) as ToolDef;

  async function generate() {
    const text = prompt.trim();
    if (!text || loading) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, prompt: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Studio"
        description="Generate Word documents, Excel spreadsheets, and images with AI."
      >
        {result && (
          <Badge variant={result.isDemo ? 'warning' : 'success'}>
            {result.isDemo ? 'Demo mode' : result.model}
          </Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = tool.type === activeType;
          return (
            <button
              key={tool.type}
              onClick={() => {
                setActiveType(tool.type);
                setResult(null);
                setError(null);
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                  : 'border-slate-200 bg-white hover:border-brand-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-slate-400'}`}
                />
                <p className="text-sm font-semibold text-slate-900">
                  {tool.title}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500">{tool.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{activeTool.title} prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={activeTool.placeholder}
              className="min-h-[160px]"
              maxLength={1000}
            />
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Try an example
              </p>
              <div className="flex flex-wrap gap-2">
                {activeTool.examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => setPrompt(example)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full">
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate {activeTool.title}
                </>
              )}
            </Button>
            {error && (
              <Alert type="error" title="Generation failed">
                {error}
              </Alert>
            )}
            {activeType === 'image' && (
              <Alert type="info">
                Image generation requires an API key with at least $1.00 in
                balance on OpenRouter. Word and Excel generation work with any
                text model.
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Output</CardTitle>
              {result && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    downloadFile(result.filename, result.mimeType, result.base64)
                  }
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!result && !loading ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center">
                <p className="text-sm text-slate-500">
                  Your generated {activeTool.title.toLowerCase()} will appear
                  here.
                </p>
              </div>
            ) : loading ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-16 flex items-center justify-center gap-3 text-sm text-slate-500">
                <Spinner /> Generating...
              </div>
            ) : result ? (
              <div className="space-y-3">
                {result.mimeType.startsWith('image/') ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                    <img
                      src={`data:${result.mimeType};base64,${result.base64}`}
                      alt={prompt}
                      className="w-full h-auto max-h-[420px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-center">
                    <activeTool.icon className="mx-auto h-10 w-10 text-brand-500" />
                    <p className="mt-3 text-sm font-medium text-slate-900">
                      {result.filename}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Ready to download
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  Generated by {result.model || 'AI'} - review the output
                  before use. AI-generated content may be inaccurate.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
