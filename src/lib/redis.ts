import IORedis from "ioredis";

const g = globalThis as unknown as { __jpxRedis?: IORedis };

/** Shared Redis connection. maxRetriesPerRequest=null is required by BullMQ. */
export function getRedis(): IORedis {
  if (!g.__jpxRedis) {
    g.__jpxRedis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    g.__jpxRedis.on("error", (err) => console.error("[redis]", err.message));
  }
  return g.__jpxRedis;
}
