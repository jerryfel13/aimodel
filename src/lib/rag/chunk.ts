export function chunkText(
  text: string,
  maxChars = 1200,
  overlap = 200,
): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = `${current.slice(-overlap)} ${trimmed}`;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
