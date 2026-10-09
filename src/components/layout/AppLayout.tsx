'use client';

import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
