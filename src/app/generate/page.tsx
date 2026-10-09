'use client';

import { useState } from 'react';
import { Check, Copy, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/PageHeader';

const CONTENT_TYPES = ['report', 'email', 'proposal', 'summary', 'blog post'];
const TONES = ['professional', 'friendly', 'formal', 'casual', 'persuasive'];
const LENGTHS = ['short', 'medium', 'long'];

export default function GeneratePage() {
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState(LENGTHS[1]);
  const [output, setOutput] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDemo, setIsDemo] = useState<boolean | null>(null);

  async function generate() {
    if (!topic.trim() || loading) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, topic, tone, length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setOutput(data.content);
      setDraft(data.content);
      setEditing(false);
      setIsDemo(data.isDemo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    const text = editing ? draft : output ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed. Select the text and copy it manually.');
    }
  }

  return (
    <>
      <PageHeader
        title="Content Generator"
        description="Generate business reports, emails, proposals, and other sample content."
      >
        {isDemo === true && <Badge variant="warning">Demo mode</Badge>}
        {isDemo === false && <Badge variant="success">OpenAI</Badge>}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Content type
              </label>
              <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Q3 product launch plan"
                maxLength={500}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tone</label>
              <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Length</label>
              <Select value={length} onChange={(e) => setLength(e.target.value)}>
                {LENGTHS.map((l) => (
                  <option key={l} value={l}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={generate} disabled={loading || !topic.trim()} className="w-full">
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" /> Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" /> Generate
                </>
              )}
            </Button>
            {error && (
              <Alert type="error" title="Generation failed">
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              {output && !editing && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setDraft(output); setEditing(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button variant="secondary" size="sm" onClick={copyOutput}>
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              )}
              {editing && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setDraft(output ?? ''); setEditing(false); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => { setOutput(draft); setEditing(false); }}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!output && !loading ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
                <p className="text-sm text-slate-500">
                  Configure the content type, topic, and tone, then generate.
                  <br />
                  The output appears here and can be edited and copied.
                </p>
              </div>
            ) : editing ? (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[420px] font-mono text-xs"
              />
            ) : (
              <div className="min-h-[420px] rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
                {loading ? (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Spinner /> Generating content...
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">
                    {output}
                  </pre>
                )}
              </div>
            )}
            {output && (
              <p className="mt-3 text-xs text-slate-400">
                Generated content is a draft - review it for accuracy before use. Placeholders like
                [Name] should be replaced with real values.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
