import { Worker, type Job } from "bullmq";
import { getEnv } from "lib/env";
import { getRedis } from "lib/redis";
import { getSetting } from "lib/settings";
import { HEARTBEAT_KEY, PAYMENTS_QUEUE, paymentsQueue, type WorkerHeartbeat } from "lib/queue";
import { pool } from "db/client";
import { pollMailbox } from "./imap/poller";
import { expireOrders } from "./jobs/expire";

getEnv(); // fail fast on bad configuration

const log = (msg: string) => console.log(`[worker ${new Date().toISOString()}] ${msg}`);
const redis = getRedis();
const queue = paymentsQueue();
let heartbeat: WorkerHeartbeat = { at: new Date().toISOString(), lastPollAt: null, lastPollResult: null, lastError: null, pollIntervalSeconds: 60 };

async function beat(patch: Partial<WorkerHeartbeat> = {}) {
  heartbeat = { ...heartbeat, ...patch, at: new Date().toISOString() };
  await redis.set(HEARTBEAT_KEY, JSON.stringify(heartbeat), "EX", 600).catch(() => undefined);
}

async function scheduleJobs() {
  const imap = await getSetting("imap");
  if (imap.pollingIntervalSeconds !== heartbeat.pollIntervalSeconds || !(await queue.getJobScheduler("imap-poll"))) {
    await queue.upsertJobScheduler(
      "imap-poll",
      { every: imap.pollingIntervalSeconds * 1000 },
      { name: "imap-poll", opts: { attempts: 3, backoff: { type: "exponential", delay: 15_000 }, removeOnComplete: 100, removeOnFail: 200 } },
    );
    await beat({ pollIntervalSeconds: imap.pollingIntervalSeconds });
    log(`IMAP poll scheduled every ${imap.pollingIntervalSeconds}s`);
  }
  await queue.upsertJobScheduler("expire-orders", { every: 60_000 }, { name: "expire-orders", opts: { removeOnComplete: 50, removeOnFail: 100 } });
}

const worker = new Worker(
  PAYMENTS_QUEUE,
  async (job: Job) => {
    switch (job.name) {
      case "imap-poll":
      case "imap-poll-now": {
        try {
          const r = await pollMailbox(log);
          await beat({ lastPollAt: new Date().toISOString(), lastPollResult: `${r.processed} processed, ${r.skipped} skipped`, lastError: null });
          await scheduleJobs(); // picks up interval changes made in the admin panel
          return r;
        } catch (err) {
          const message = (err as Error).message ?? String(err);
          await beat({ lastPollAt: new Date().toISOString(), lastError: message.slice(0, 500) });
          throw err; // BullMQ retries with exponential backoff
        }
      }
      case "expire-orders": {
        const n = await expireOrders();
        if (n) log(`expired ${n} order(s)`);
        return { expired: n };
      }
      default:
        log(`unknown job ${job.name}`);
    }
  },
  { connection: getRedis(), concurrency: 1 },
);

worker.on("failed", (job, err) => log(`job ${job?.name} failed (attempt ${job?.attemptsMade}): ${err.message}`));

async function main() {
  await scheduleJobs();
  await beat();
  setInterval(() => void beat(), 30_000).unref();
  log("payment worker started");
}

async function shutdown(signal: string) {
  log(`${signal} received, shutting down`);
  await worker.close();
  await queue.close();
  await pool.end();
  redis.disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
