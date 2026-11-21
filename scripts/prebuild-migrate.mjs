// Runs before `next build` (see package.json "build").
// On Vercel, applies pending SQL migrations first so the build never prerenders against an older
// database schema (e.g. "column ... does not exist"). Locally / in Docker it does nothing, since
// those builds usually have no database; use `pnpm db:migrate` there.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
const enabled = process.env.VERCEL === "1" && process.env.SKIP_BUILD_MIGRATIONS !== "1";

if (!enabled || !url) {
  console.log(`[migrate] skipped (${!enabled ? "not a Vercel build" : "DATABASE_URL not set"})`);
  process.exit(0);
}

const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("@postgres:");
const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15000, ssl: isRemote ? { rejectUnauthorized: false } : undefined });

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: "src/db/migrations" });
  console.log("[migrate] database schema is up to date");
} catch (err) {
  console.error("[migrate] failed to apply migrations:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
