try {
  process.loadEnvFile?.();
} catch {}

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "db/schema";

type Db = NodePgDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { __jpxPool?: Pool; __jpxDb?: Db };

const url = process.env.DATABASE_URL;
const isRemote = Boolean(
  url && !url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("@postgres:")
);

// The pool does not connect until the first query, so importing this module is cheap.
export const pool =
  globalForDb.__jpxPool ??
  new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

export const db: Db = globalForDb.__jpxDb ?? drizzle({ client: pool, schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__jpxPool = pool;
  globalForDb.__jpxDb = db;
}

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
