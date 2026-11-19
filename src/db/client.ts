try {
  process.loadEnvFile?.();
} catch { }

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "db/schema";

type Db = NodePgDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { __jpxPool?: Pool; __jpxDb?: Db };

let url = process.env.DATABASE_URL;
if (url) {
  // Supabase Connection Pooler: port 5432 is Session Mode (max 15 clients, causes EMAXCONNSESSION).
  // Port 6543 is Transaction Mode (multiplexed, designed for serverless / Vercel).
  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }
}

const isRemote = Boolean(
  url && !url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("@postgres:")
);
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Serverless (Vercel Fluid compute) reuses warm instances across many concurrent requests.
// The old settings (max 1, 1s idle timeout) serialised every parallel query on one connection and
// closed it almost immediately, so most requests paid a fresh TLS + auth handshake to Supabase.
// Supabase's transaction pooler (port 6543) multiplexes, so a few connections per instance is safe.
export const pool =
  globalForDb.__jpxPool ??
  new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? (isServerless ? 5 : 10)),
    idleTimeoutMillis: isServerless ? 60_000 : 30_000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    allowExitOnIdle: true,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

export const db: Db = globalForDb.__jpxDb ?? drizzle({ client: pool, schema });

// Always cache pool and db on globalThis so serverless instances reuse connections
globalForDb.__jpxPool = pool;
globalForDb.__jpxDb = db;

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
