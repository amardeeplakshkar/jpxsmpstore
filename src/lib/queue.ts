import { Queue } from "bullmq";
import { getRedis, redisConfigured } from "lib/redis";

export const PAYMENTS_QUEUE = "payments";
export const HEARTBEAT_KEY = "worker:heartbeat";

const g = globalThis as unknown as { __jpxQueue?: Queue };

export function paymentsQueue(): Queue {
  if (!g.__jpxQueue) g.__jpxQueue = new Queue(PAYMENTS_QUEUE, { connection: getRedis() });
  return g.__jpxQueue;
}

export type WorkerHeartbeat = {
  at: string;
  lastPollAt: string | null;
  lastPollResult: string | null;
  lastError: string | null;
  pollIntervalSeconds: number;
};

export async function getWorkerHeartbeat(): Promise<WorkerHeartbeat | null> {
  if (!redisConfigured()) return null;
  try {
    const fetchHeartbeat = async () => {
      const raw = await getRedis().get(HEARTBEAT_KEY);
      return raw ? (JSON.parse(raw) as WorkerHeartbeat) : null;
    };
    // Never allow Redis checks to hang or delay page rendering for more than 1.5s
    return await Promise.race([
      fetchHeartbeat(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
    ]);
  } catch {
    return null;
  }
}
