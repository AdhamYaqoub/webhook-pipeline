import { config } from '../config';

interface Bucket {
  count: number;
  windowStart: number; // ms
}

const buckets = new Map<string, Bucket>();

export function shouldRateLimit(key: string): boolean {
  if (!config.rateLimit.enabled) return false;

  const now = Date.now();
  const windowMs = config.rateLimit.windowSeconds * 1000;
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  const nextCount = existing.count + 1;
  buckets.set(key, { ...existing, count: nextCount });

  return nextCount > config.rateLimit.requests;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetAllRateLimits(): void {
  buckets.clear();
}
