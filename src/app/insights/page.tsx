'use client';

import { useRef, useState } from 'react';
import {
  BarChart3,
  FileUp,
  Lightbulb,
  Sparkles,
  Table2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import type { DataStats } from '@/lib/ai/types';

interface InsightsResult {
  stats: DataStats;
  observations: string[];
  recommendations: string[];
  isDemo: boolean;
}

const MAX_BYTES = 200 * 1024;

export default function InsightsPage() {
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightsResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function analyze(text: string) {
    if (!text.trim() || loading) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: text }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || 'Analysis failed');
      setResult(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSample() {
    try {
      const res = await fetch('/samples/sales_data.csv');
      if (!res.ok) throw new Error('Could not load sample data');
      const text = await res.text();
      setData(text);
      await analyze(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sample data.');
    }
  }

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError('File must be under 200 KB.');
      return;
    }
    const text = await file.text();
    setData(text);
    await analyze(text);
  };

  return (
    <>
      <PageHeader
        title="AI Insights"
        description="Paste or upload sample business data (CSV or JSON) to surface patterns and recommendations."
      >
        {result && (
          <Badge variant={result.isDemo ? 'warning' : 'success'}>
            {result.isDemo ? 'Demo mode' : 'OpenAI'}
          </Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Input data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Paste CSV or JSON here, e.g.&#10;month,revenue,units&#10;Jan,48200,412&#10;Feb,51900,445"
              className="min-h-[240px] font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void analyze(data)} disabled={loading || !data.trim()}>
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" /> Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" /> Analyze data
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={loadSample} disabled={loading}>
                <Table2 className="h-4 w-4 mr-2" /> Load sample CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <FileUp className="h-4 w-4 mr-2" /> Upload CSV/JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
            </div>
            {error && (
              <Alert type="error" title="Analysis failed">
                {error}
              </Alert>
            )}
            <Alert type="info">
              Use sample data only. Do not paste real client or customer data into this prototype.
            </Alert>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading ? (
            <EmptyState
              icon={Lightbulb}
              title="No data analyzed yet"
              description="Paste CSV/JSON data or load the sample to see computed statistics, observations, and recommendations."
            />
          ) : (
            <>
              {result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-brand-500" />
                      Computed statistics
                      <Badge variant="info">from your data</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500 mb-3">
                      {result.stats.rowCount} rows x {result.stats.columns.length} columns (
                      {result.stats.format.toUpperCase()}) - computed deterministically, not by the AI.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                            <th className="py-2 pr-4 font-semibold">Column</th>
                            <th className="py-2 pr-4 font-semibold">Type</th>
                            <th className="py-2 pr-4 font-semibold">Missing</th>
                            <th className="py-2 font-semibold">Statistics</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.stats.columns.map((col) => (
                            <tr key={col.name} className="border-b border-slate-100">
                              <td className="py-2.5 pr-4 font-medium text-slate-900">{col.name}</td>
                              <td className="py-2.5 pr-4 text-slate-600">{col.type}</td>
                              <td className="py-2.5 pr-4">
                                {col.missing > 0 ? (
                                  <span className="text-amber-600 font-medium">{col.missing}</span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {col.type === 'number' ? (
                                  <span>
                                    min {col.min} / max {col.max} / mean {col.mean} / median{' '}
                                    {col.median}
                                  </span>
                                ) : (
                                  <span>
                                    {col.unique} unique
                                    {col.topValues && col.topValues.length > 0 &&
                                      ` - top: ${col.topValues
                                        .map((t) => `"${t.value}" (${t.count})`)
                                        .join(', ')}`}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Spinner /> Analyzing data and generating insights...
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Table2 className="h-4 w-4 text-brand-500" />
                        Data findings
                        <Badge variant="info">computed from your data</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.observations.map((obs, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        AI recommendations
                        <Badge variant="warning">suggestions - validate before use</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-xs text-slate-400">
                        Recommendations are AI-generated suggestions based on the supplied data. They
                        are not validated predictions and no accuracy is implied.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
