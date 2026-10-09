import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai';
import { recordActivity } from '@/lib/activity';
import { buildDocx } from '@/lib/files/docx';
import { buildXlsx } from '@/lib/files/xlsx';
import { checkRateLimit, clientIp, sanitizeText } from '@/lib/validators';

const MAX_PROMPT_CHARS = 1000;
const MAX_BASE64_CHARS = 16 * 1024 * 1024;

export async function POST(request: Request) {
  const limit = checkRateLimit(`studio:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { type, prompt } = body ?? {};

    if (type !== 'docx' && type !== 'xlsx' && type !== 'image') {
      return NextResponse.json(
        { error: 'type must be docx, xlsx, or image.' },
        { status: 400 },
      );
    }
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
    }

    const cleanPrompt = sanitizeText(prompt, MAX_PROMPT_CHARS);
    const provider = getProvider();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (type === 'image') {
      const image = await provider.generateImage(cleanPrompt);
      if (image.base64.length > MAX_BASE64_CHARS) {
        return NextResponse.json(
          { error: 'The generated image is too large to deliver.' },
          { status: 422 },
        );
      }
      const extension = image.mimeType === 'image/svg+xml' ? 'svg' : 'png';
      recordActivity('studio', 'Generated image', 'success');
      return NextResponse.json({
        filename: `ai-image-${timestamp}.${extension}`,
        mimeType: image.mimeType,
        base64: image.base64,
        model: provider.lastUsedModel,
        isDemo: provider.isDemo,
      });
    }

    if (type === 'docx') {
      const content = await provider.generateDocument(cleanPrompt);
      const buffer = await buildDocx(content);
      recordActivity('studio', 'Generated Word document', 'success');
      return NextResponse.json({
        filename: `ai-document-${timestamp}.docx`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        base64: buffer.toString('base64'),
        model: provider.lastUsedModel,
        isDemo: provider.isDemo,
      });
    }

    const data = await provider.generateSpreadsheet(cleanPrompt);
    const buffer = buildXlsx(data);
    recordActivity('studio', 'Generated Excel spreadsheet', 'success');
    return NextResponse.json({
      filename: `ai-spreadsheet-${timestamp}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: buffer.toString('base64'),
      model: provider.lastUsedModel,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    recordActivity('studio', 'File generation', 'error');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 502 });
  }
}
