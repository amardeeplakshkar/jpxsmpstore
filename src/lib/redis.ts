try {
  process.loadEnvFile?.();
} catch {}

import IORedis from "ioredis";

const g = globalThis as unknown as { __jpxRedis?: IORedis };

const isServerlessEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * True when a Redis server is actually configured. On Vercel without REDIS_URL there is nothing
 * listening on localhost, and every rate-limit / heartbeat call used to wait for a connect timeout.
 */
export function redisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL) || !isServerlessEnv;
}

/** Shared Redis connection. maxRetriesPerRequest=null is required by BullMQ, but bounded on serverless. */
export function getRedis(): IORedis {
  if (!g.__jpxRedis) {
    let url = process.env.REDIS_URL ?? "redis://localhost:6379";
    // Upstash requires TLS (rediss://)
    if (url.includes("upstash.io") && url.startsWith("redis://")) {
      url = url.replace(/^redis:\/\//, "rediss://");
    }
    const isUpstash = url.includes("upstash.io");
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

    g.__jpxRedis = new IORedis(url, {
      maxRetriesPerRequest: isServerless ? 1 : null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: isServerless ? 1500 : 5000,
      commandTimeout: isServerless ? 800 : undefined,
      retryStrategy(times) {
        if (isServerless && times > 1) return null; // don't loop endlessly in serverless
        return Math.min(times * 100, 2000);
      },
      tls: isUpstash || url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    });
    g.__jpxRedis.on("error", (err) => console.warn("[redis]", err.message));
  }
  return g.__jpxRedis;
}
