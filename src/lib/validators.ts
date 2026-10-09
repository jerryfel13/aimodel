export function sanitizeText(input: string, maxLength: number): string {
  return input.replace(/\u0000/g, '').trim().slice(0, maxLength);
}

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export function checkRateLimit(key: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }
  return { ok: true };
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
