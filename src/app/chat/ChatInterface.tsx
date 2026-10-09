'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_PROMPTS = [
  'How can AI improve customer support?',
  'Draft talking points for a sales meeting',
  'What are common pitfalls in AI adoption?',
  'Suggest ways to measure marketing ROI',
];

export default function ChatInterface() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your AI business assistant. Ask me anything about business strategy, operations, marketing, or technology. Try one of the example prompts below.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt) {
      void send(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(content: string) {
    const text = content.trim();
    if (!text || loading) return;

    setError(null);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setIsDemo(data.isDemo);
      setModel(data.model ?? null);
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages(next);
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Chat Assistant"
        description="Ask questions and get contextual business answers. Conversation history is kept for this session."
      >
        {isDemo === true && <Badge variant="warning">Demo mode</Badge>}
        {isDemo === false && (
          <Badge variant="success">Live · {model ?? 'AI'}</Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user' ? 'bg-brand-600' : 'bg-slate-200'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                    <Bot className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="rounded-xl bg-slate-100 px-4 py-3.5 flex gap-1.5">
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              {error && (
                <div className="mb-3">
                  <Alert type="error" title="Unable to get a response">
                    {error}
                  </Alert>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  disabled={loading}
                  maxLength={4000}
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-2 text-xs text-slate-400">
                AI responses may be inaccurate. Verify important information before relying on it.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3">Try asking</p>
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void send(prompt)}
                  disabled={loading}
                  className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
