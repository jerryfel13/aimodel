import { Suspense } from 'react';
import ChatInterface from './ChatInterface';

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-sm text-slate-500">
          Loading chat...
        </div>
      }
    >
      <ChatInterface />
    </Suspense>
  );
}
