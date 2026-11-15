try {
  process.loadEnvFile?.();
} catch {}

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://jpxmc:jpxmc@localhost:5432/jpxmc" },
  strict: true,
  verbose: true,
});
