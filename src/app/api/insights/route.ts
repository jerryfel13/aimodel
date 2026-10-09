import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai';
import { recordActivity } from '@/lib/activity';
import { computeStats, MAX_COLUMNS, MAX_DATA_BYTES, MAX_ROWS, parseData } from '@/lib/insights';
import { checkRateLimit, clientIp } from '@/lib/validators';

export async function POST(request: Request) {
  const limit = checkRateLimit(`insights:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { data } = body ?? {};

    if (typeof data !== 'string' || !data.trim()) {
      return NextResponse.json({ error: 'Paste CSV or JSON data to analyze.' }, { status: 400 });
    }
    if (data.length > MAX_DATA_BYTES) {
      return NextResponse.json(
        { error: `Data must be under ${MAX_DATA_BYTES / 1024} KB.` },
        { status: 400 },
      );
    }

    const { format, rows } = parseData(data);

    if (rows.length === 0 || rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Provide between 1 and ${MAX_ROWS} data rows.` },
        { status: 400 },
      );
    }

    const stats = computeStats(rows, format);
    if (stats.columns.length === 0 || stats.columns.length > MAX_COLUMNS) {
      return NextResponse.json(
        { error: `Provide between 1 and ${MAX_COLUMNS} columns.` },
        { status: 400 },
      );
    }

    const provider = getProvider();
    const { observations, recommendations } = await provider.generateInsights(stats);

    recordActivity('insights', 'Data insights', 'success', `${rows.length} rows`);
    return NextResponse.json({
      stats,
      observations,
      recommendations,
      provider: provider.id,
      model: provider.lastUsedModel,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    recordActivity('insights', 'Data insights', 'error');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 422 });
  }
}
