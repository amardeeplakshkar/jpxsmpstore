try {
  process.loadEnvFile?.();
} catch {}

import { db, pool } from "db/client";
import { categories } from "db/schema";
import { getSetting, saveSetting } from "lib/settings";

/**
 * Seeds default store settings (from env bootstrap values) and empty starter categories.
 * It deliberately creates NO products or prices: add the real JPXMC catalog in the admin panel.
 */
async function main() {
  for (const key of ["branding", "homepage", "server", "community", "legal", "payment", "imap"] as const) {
    const value = await getSetting(key);
    if (key === "imap") {
      const imapVal = value as { trustedSenders?: string[] };
      if (!Array.isArray(imapVal.trustedSenders)) {
        imapVal.trustedSenders = [];
      }
      if (!imapVal.trustedSenders.includes("noreply@slice.bank.in")) {
        imapVal.trustedSenders.push("noreply@slice.bank.in");
      }
    }
    await saveSetting(key, value as never, null);
    console.log(`settings: ${key}`);
  }
  await db
    .insert(categories)
    .values([
      { name: "Ranks", slug: "ranks", productType: "RANK", sortOrder: 0 },
      { name: "Crates", slug: "crates", productType: "CRATE", sortOrder: 10 },
      { name: "Coins", slug: "coins", productType: "COINS", sortOrder: 20 },
    ])
    .onConflictDoNothing();
  console.log("categories: starter categories ensured");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
