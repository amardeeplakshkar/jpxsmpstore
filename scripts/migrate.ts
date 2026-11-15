try {
  process.loadEnvFile?.();
} catch {}

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Applies SQL migrations from src/db/migrations. Safe to run on every deploy. */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const url = process.env.DATABASE_URL;
  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("@postgres:");
  const pool = new Pool({
    connectionString: url,
    max: 1,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "src/db/migrations" });
  await pool.end();
  console.log("Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
