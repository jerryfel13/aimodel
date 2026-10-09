'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MessageSquare,
  PenLine,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/documents', label: 'Document Analyzer', icon: FileText },
  { href: '/generate', label: 'Content Generator', icon: PenLine },
  { href: '/insights', label: 'AI Insights', icon: BarChart3 },
  { href: '/studio', label: 'AI Studio', icon: Wand2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [provider, setProvider] = useState<{ label: string; isDemo: boolean } | null>(
    null,
  );

  useEffect(() => {
    fetch('/api/activity')
      .then((r) => r.json())
      .then((d) => setProvider(d.provider ?? null))
      .catch(() => setProvider({ label: 'Demo mode', isDemo: true }));
  }, []);

  const renderNav = (mobile: boolean) => (
    <nav className={mobile ? 'flex gap-1 overflow-x-auto' : 'flex-1 px-3 py-4 space-y-1'}>
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              mobile
                ? `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                : `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col bg-slate-900 text-white z-40">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">AI Business Assistant</p>
            <p className="text-xs text-slate-400 leading-tight">Prototype</p>
          </div>
        </div>
        {renderNav(false)}
        <div className="p-4 border-t border-slate-800">
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              provider && !provider.isDemo
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-amber-500/10 text-amber-300'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {provider === null
              ? 'Checking AI provider...'
              : provider.isDemo
                ? 'Demo mode - no API key'
                : provider.label}
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-slate-900 text-white z-40 flex items-center gap-3 px-4 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 flex-shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-semibold whitespace-nowrap">AI Assistant</p>
        {renderNav(true)}
      </div>
    </>
  );
}
