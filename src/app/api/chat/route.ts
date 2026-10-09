import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai';
import { recordActivity } from '@/lib/activity';
import { checkRateLimit, clientIp, sanitizeText } from '@/lib/validators';

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;

const SYSTEM_PROMPT = `You are a helpful, professional business assistant for a prototype AI business assistant application.
- Answer questions clearly and concisely.
- If you are unsure or lack information, say so rather than guessing.
- Do not present speculation as fact.
- When giving business advice, note that it is general guidance, not professional advice.`;

export async function POST(request: Request) {
  const limit = checkRateLimit(`chat:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Provide between 1 and ${MAX_MESSAGES} messages.` },
        { status: 400 },
      );
    }

    const cleaned = messages
      .filter(
        (m: unknown) =>
          m &&
          typeof m === 'object' &&
          typeof (m as Record<string, unknown>).content === 'string' &&
          ((m as Record<string, unknown>).role === 'user' ||
            (m as Record<string, unknown>).role === 'assistant'),
      )
      .slice(-MAX_MESSAGES)
      .map((m: Record<string, unknown>) => ({
        role: m.role as 'user' | 'assistant',
        content: sanitizeText(m.content as string, MAX_MESSAGE_CHARS),
      }));

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'No valid messages provided.' }, { status: 400 });
    }

    const provider = getProvider();
    const reply = await provider.complete(
      [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned],
      { maxTokens: 2048 },
    );

    recordActivity('chat', 'Chat message', 'success');
    return NextResponse.json({
      reply,
      provider: provider.id,
      model: provider.lastUsedModel,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    recordActivity('chat', 'Chat message', 'error');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: `AI service error: ${message}` }, { status: 502 });
  }
}
