'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  FileText,
  Lightbulb,
  MessageSquare,
  PenLine,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';

interface ActivityEvent {
  id: number;
  timestamp: number;
  tool: string;
  action: string;
  status: string;
  detail?: string;
}

interface ActivitySummary {
  total: number;
  today: number;
  byTool: Record<string, number>;
  recent: ActivityEvent[];
  provider: { id: string; label: string; isDemo: boolean };
}

const TOOLS = [
  {
    href: '/chat',
    name: 'AI Chat',
    description: 'Ask questions and get contextual business answers.',
    icon: MessageSquare,
  },
  {
    href: '/documents',
    name: 'Document Analyzer',
    description:
      'Upload PDFs or TXT files to summarize, extract key points, and ask questions.',
    icon: FileText,
  },
  {
    href: '/generate',
    name: 'Content Generator',
    description: 'Draft reports, emails, proposals, and more with configurable tone.',
    icon: PenLine,
  },
  {
    href: '/insights',
    name: 'AI Insights',
    description: 'Upload CSV or JSON data to surface patterns and recommendations.',
    icon: BarChart3,
  },
];

const EXAMPLE_PROMPTS = [
  'How can AI improve customer support?',
  'Draft talking points for a sales meeting',
  'What are common pitfalls in AI adoption?',
  'Suggest ways to measure marketing ROI',
];

const TOOL_LABELS: Record<string, string> = {
  chat: 'AI Chat',
  documents: 'Documents',
  generate: 'Content Generator',
  insights: 'AI Insights',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/activity');
      if (!res.ok) throw new Error('Failed to load activity');
      setSummary(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of available AI tools and recent activity.">
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total requests"
          value={summary?.total ?? 0}
          icon={MessageSquare}
          subtitle="Since server start"
        />
        <StatCard
          label="Requests today"
          value={summary?.today ?? 0}
          icon={RefreshCw}
          subtitle="Current calendar day"
        />
        <StatCard
          label="Chat messages"
          value={summary?.byTool.chat ?? 0}
          icon={MessageSquare}
        />
        <StatCard
          label="Documents analyzed"
          value={summary?.byTool.documents ?? 0}
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Available AI tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="group rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-brand-600" />
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{tool.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!summary || summary.recent.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="No activity yet"
                description="Use any AI tool to see activity here."
              />
            ) : (
              <ul className="space-y-3">
                {summary.recent.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        event.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-slate-900 font-medium truncate">{event.action}</p>
                      <p className="text-xs text-slate-400">
                        {TOOL_LABELS[event.tool] ?? event.tool}
                        {event.detail ? ` - ${event.detail}` : ''} -{' '}
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Example prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <Link
                    href={`/chat?prompt=${encodeURIComponent(prompt)}`}
                    className="block rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    {prompt}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prototype limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  This is a proof of concept. It demonstrates possible AI capabilities and does
                  not solve any specific client business problem.
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  AI outputs may be inaccurate. Always verify important information before relying
                  on it.
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  Usage statistics reset when the server restarts. No database is connected in
                  this prototype.
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  Do not upload real client or customer data. Use the provided sample files.
                </span>
              </li>
            </ul>
            {summary?.provider.isDemo && (
              <div className="mt-4">
                <Badge variant="warning">Demo mode - connect an API key for live AI responses</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
