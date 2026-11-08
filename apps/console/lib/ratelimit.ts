import type { RateLimit } from '@agentgate/shared';

interface Bucket {
  tokens: number;
  updated: number;
}

type G = typeof globalThis & { __agBuckets?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  const g = globalThis as G;
  if (!g.__agBuckets) g.__agBuckets = new Map();
  return g.__agBuckets;
}

/**
 * In-memory token bucket keyed by sid + action and sid + '*'. A request consumes one token from
 * every applicable bucket, and only when all of them have a token left.
 */
export function checkRateLimit(sid: string, action: string, limits: RateLimit[]): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const applicable = limits.filter((l) => l.action === action || l.action === '*');
  const states = applicable.map((l) => {
    const key = `${sid}|${l.action}`;
    const b = buckets().get(key) ?? { tokens: l.perMinute, updated: now };
    b.tokens = Math.min(l.perMinute, b.tokens + ((now - b.updated) / 60000) * l.perMinute);
    b.updated = now;
    buckets().set(key, b);
    return { l, b };
  });
  let limited = false;
  let retryAfterSec = 0;
  for (const { l, b } of states) {
    if (b.tokens < 1) {
      limited = true;
      retryAfterSec = Math.max(retryAfterSec, Math.ceil((1 - b.tokens) / (l.perMinute / 60)));
    }
  }
  if (!limited) for (const { b } of states) b.tokens -= 1;
  return { limited, retryAfterSec };
}

export function resetRateLimits() {
  buckets().clear();
}
