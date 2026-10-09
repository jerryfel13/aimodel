import pdfParse from 'pdf-parse';

export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['pdf', 'txt'];
export const MAX_EXTRACTED_CHARS = 20000;

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() as string) : '';
}

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const ext = getExtension(filename);
  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString('utf-8');
}
