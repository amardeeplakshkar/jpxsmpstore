try {
  process.loadEnvFile?.();
} catch {}

import IORedis from "ioredis";

const g = globalThis as unknown as { __jpxRedis?: IORedis };

/** Shared Redis connection. maxRetriesPerRequest=null is required by BullMQ. */
export function getRedis(): IORedis {
  if (!g.__jpxRedis) {
    let url = process.env.REDIS_URL ?? "redis://localhost:6379";
    // Upstash requires TLS (rediss://)
    if (url.includes("upstash.io") && url.startsWith("redis://")) {
      url = url.replace(/^redis:\/\//, "rediss://");
    }
    g.__jpxRedis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    g.__jpxRedis.on("error", (err) => console.error("[redis]", err.message));
  }
  return g.__jpxRedis;
}
