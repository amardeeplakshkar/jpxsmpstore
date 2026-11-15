try {
  process.loadEnvFile?.();
} catch { }

import { db, pool } from "db/client";
import { categories, gameModes } from "db/schema";
import { getSetting, saveSetting } from "lib/settings";

/**
 * Seeds default store settings (from env bootstrap values) and empty starter categories.
 * It deliberately creates NO products or prices: add the real JPXMC catalog in the admin panel.
 */
async function main() {
  for (const key of ["branding", "homepage", "server", "community", "legal", "payment", "imap", "discount", "social"] as const) {
    const value = await getSetting(key);
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
  await db
    .insert(gameModes)
    .values([
      { name: "Survival", slug: "survival", description: "Ranks, crate keys and coins for the Survival server.", accentColor: "#10b981", allowedTypes: ["RANK", "CRATE", "COINS", "CUSTOM"], sortOrder: 0 },
      { name: "PvP", slug: "pvp", description: "Ranks and perks for the PvP server.", accentColor: "#ef4444", allowedTypes: ["RANK", "COINS", "CUSTOM"], sortOrder: 10 },
    ])
    .onConflictDoNothing();
  console.log("game modes: Survival and PvP ensured (edit them in Admin > Game modes)");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
