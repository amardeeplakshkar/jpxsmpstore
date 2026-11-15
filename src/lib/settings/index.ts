import { eq } from "drizzle-orm";
import { db, type DbOrTx } from "db/client";
import { storeSettings } from "db/schema";
import { encryptSecret } from "lib/crypto";
import { SETTINGS, type ImapPublic, type SettingsKey, type SettingsValue } from "lib/settings/schemas";

/** Values from environment variables used only when nothing is stored in the database yet. */
function envBootstrap(key: SettingsKey): Record<string, unknown> {
  if (key === "payment") {
    return { upiId: process.env.UPI_ID ?? "", payeeName: process.env.UPI_PAYEE_NAME || "JPXMC" };
  }
  if (key === "imap") {
    const host = process.env.IMAP_HOST ?? "";
    let passwordEncrypted = "";
    if (process.env.IMAP_PASSWORD && process.env.ENCRYPTION_KEY) {
      try {
        passwordEncrypted = encryptSecret(process.env.IMAP_PASSWORD);
      } catch {
        passwordEncrypted = "";
      }
    }
    return {
      enabled: Boolean(host && process.env.IMAP_USERNAME && process.env.IMAP_PASSWORD),
      host,
      port: Number(process.env.IMAP_PORT ?? 993),
      username: process.env.IMAP_USERNAME ?? "",
      passwordEncrypted,
    };
  }
  return {};
}

export async function getSetting<K extends SettingsKey>(key: K, tx: DbOrTx = db): Promise<SettingsValue<K>> {
  const schema = SETTINGS[key];
  let stored: Record<string, unknown> | null = null;
  try {
    const row = await tx.query.storeSettings.findFirst({ where: eq(storeSettings.key, key) });
    stored = row?.value ?? null;
  } catch (err) {
    console.error(`[settings] failed to load ${key}`, (err as Error).message);
  }
  const raw = stored ?? envBootstrap(key);
  const parsed = schema.safeParse(raw);
  // Corrupt or outdated rows fall back to defaults instead of breaking the storefront.
  return (parsed.success ? parsed.data : schema.parse({})) as SettingsValue<K>;
}

export async function saveSetting<K extends SettingsKey>(key: K, value: SettingsValue<K>, userId: string | null, tx: DbOrTx = db) {
  const parsed = SETTINGS[key].parse(value) as Record<string, unknown>;
  await tx
    .insert(storeSettings)
    .values({ key, value: parsed, updatedBy: userId })
    .onConflictDoUpdate({ target: storeSettings.key, set: { value: parsed, updatedBy: userId, updatedAt: new Date() } });
}

export async function getPublicImap(): Promise<ImapPublic> {
  const { passwordEncrypted, ...rest } = await getSetting("imap");
  return { ...rest, passwordSet: Boolean(passwordEncrypted) };
}

export async function getStorefrontSettings() {
  const [branding, homepage, server, community, legal, discount, social] = await Promise.all([
    getSetting("branding"),
    getSetting("homepage"),
    getSetting("server"),
    getSetting("community"),
    getSetting("legal"),
    getSetting("discount"),
    getSetting("social"),
  ]);
  return { branding, homepage, server, community, legal, discount, social };
}
export type StorefrontSettings = Awaited<ReturnType<typeof getStorefrontSettings>>;
