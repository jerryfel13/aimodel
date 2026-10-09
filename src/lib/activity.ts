import { getProvider } from './ai';

export type ToolName = 'chat' | 'documents' | 'generate' | 'insights' | 'studio';

export interface ActivityEvent {
  id: number;
  timestamp: number;
  tool: ToolName;
  action: string;
  status: 'success' | 'error';
  detail?: string;
}

const events: ActivityEvent[] = [];
let nextId = 1;
const MAX_EVENTS = 200;

export function recordActivity(tool: ToolName, action: string, status: 'success' | 'error', detail?: string): void {
  events.unshift({ id: nextId++, timestamp: Date.now(), tool, action, status, detail });
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

export interface ActivitySummary {
  total: number;
  today: number;
  byTool: Record<string, number>;
  recent: ActivityEvent[];
  provider: { id: string; label: string; isDemo: boolean };
}

export function getActivitySummary(): ActivitySummary {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const byTool: Record<string, number> = {};
  for (const e of events) {
    byTool[e.tool] = (byTool[e.tool] ?? 0) + 1;
  }

  return {
    total: events.length,
    today: events.filter((e) => e.timestamp >= startOfDay.getTime()).length,
    byTool,
    recent: events.slice(0, 15),
    provider: { id: getProvider().id, label: getProvider().label, isDemo: getProvider().isDemo },
  };
}
