import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai';
import { recordActivity } from '@/lib/activity';
import { checkRateLimit, clientIp, sanitizeText } from '@/lib/validators';

const CONTENT_TYPES = ['report', 'email', 'proposal', 'summary', 'blog post'];
const TONES = ['professional', 'friendly', 'formal', 'casual', 'persuasive'];
const LENGTHS = ['short', 'medium', 'long'];
const MAX_TOPIC_CHARS = 500;

export async function POST(request: Request) {
  const limit = checkRateLimit(`generate:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { contentType, topic, tone, length } = body ?? {};

    if (!CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `contentType must be one of: ${CONTENT_TYPES.join(', ')}.` },
        { status: 400 },
      );
    }
    if (typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'A topic is required.' }, { status: 400 });
    }
    if (!TONES.includes(tone)) {
      return NextResponse.json(
        { error: `tone must be one of: ${TONES.join(', ')}.` },
        { status: 400 },
      );
    }
    if (!LENGTHS.includes(length)) {
      return NextResponse.json(
        { error: `length must be one of: ${LENGTHS.join(', ')}.` },
        { status: 400 },
      );
    }

    const provider = getProvider();
    const content = await provider.generateContent(
      contentType,
      sanitizeText(topic, MAX_TOPIC_CHARS),
      tone,
      length,
    );

    recordActivity('generate', `Generated ${contentType}`, 'success');
    return NextResponse.json({
      content,
      provider: provider.id,
      model: provider.lastUsedModel,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    recordActivity('generate', 'Content generation', 'error');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: `AI service error: ${message}` }, { status: 502 });
  }
}
