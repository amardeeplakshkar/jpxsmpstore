try {
  process.loadEnvFile?.();
} catch { }

import { z } from "zod";

const hexKey = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex characters (32 bytes)");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  ADMIN_DISCORD_IDS: z.string().optional().default(""),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: hexKey,
  IMAP_HOST: z.string().optional().default(""),
  IMAP_PORT: z.coerce.number().int().positive().optional().default(993),
  IMAP_USERNAME: z.string().optional().default(""),
  IMAP_PASSWORD: z.string().optional().default(""),
  UPI_ID: z.string().optional().default(""),
  UPI_PAYEE_NAME: z.string().optional().default("JPXMC"),
  STORAGE_DRIVER: z.enum(["local", "cloudinary"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./storage"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  MINECRAFT_STATUS_API: z.string().url().default("https://api.mcsrvstat.us/3"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validates environment variables once and caches them. Throws with a readable list of problems. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  if (parsed.data.STORAGE_DRIVER === "cloudinary") {
    const e = parsed.data;
    if (!e.CLOUDINARY_CLOUD_NAME || !e.CLOUDINARY_API_KEY || !e.CLOUDINARY_API_SECRET) {
      throw new Error("Invalid environment configuration:\n  - CLOUDINARY_*: required when STORAGE_DRIVER=cloudinary");
    }
  }
  cached = parsed.data;
  return cached;
}

export function adminBootstrapIds(): string[] {
  return getEnv()
    .ADMIN_DISCORD_IDS.split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{5,25}$/.test(s));
}

export function appUrl(): string {
  return getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}
