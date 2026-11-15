import { getRedis } from "lib/redis";
import { ApiError } from "lib/api";

/**
 * Fixed-window rate limiter backed by Redis. Fails open (allows the request) if Redis is unavailable,
 * so a Redis outage never takes the store down; the event is logged.
 */
export async function rateLimit(bucket: string, identifier: string, limit: number, windowSec: number) {
  const key = `rl:${bucket}:${identifier}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    if (count > limit) {
      throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down and try again shortly.");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("[rate-limit] redis unavailable, allowing request", (err as Error).message);
  }
}
