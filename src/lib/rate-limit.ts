import { getRedis, redisConfigured } from "lib/redis";
import { ApiError } from "lib/api";

/** In-process fallback window used when Redis is not configured (per serverless instance, best effort). */
const memory = new Map<string, { count: number; resetAt: number }>();
function memoryHit(key: string, windowSec: number): number {
  const now = Date.now();
  if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/**
 * Fixed-window rate limiter backed by Redis (one round trip via MULTI). Fails open if Redis is
 * unavailable so an outage never takes the store down. Without REDIS_URL on Vercel it uses an
 * in-memory window instead of waiting on a connection that will never succeed.
 */
export async function rateLimit(bucket: string, identifier: string, limit: number, windowSec: number) {
  const key = `rl:${bucket}:${identifier}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  let count: number;
  if (!redisConfigured()) {
    count = memoryHit(key, windowSec);
  } else {
    try {
      const res = await getRedis().multi().incr(key).expire(key, windowSec, "NX").exec();
      count = Number(res?.[0]?.[1] ?? 0);
    } catch (err) {
      console.error("[rate-limit] redis unavailable, using memory window", (err as Error).message);
      count = memoryHit(key, windowSec);
    }
  }
  if (count > limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down and try again shortly.");
  }
}
