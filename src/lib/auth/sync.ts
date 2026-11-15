import { eq, sql } from "drizzle-orm";
import { db } from "db/client";
import { adminUsers, users } from "db/schema";
import { adminBootstrapIds } from "lib/env";
import { audit } from "lib/audit";
import type { DiscordUser } from "lib/discord/oauth";

/** Upserts the Discord profile keyed by Discord ID and bootstraps admins from ADMIN_DISCORD_IDS. */
export async function syncDiscordUser(d: DiscordUser) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [user] = await tx
      .insert(users)
      .values({
        discordId: d.id,
        username: d.username,
        globalName: d.global_name ?? null,
        avatar: d.avatar ?? null,
        lastLoginAt: now,
      })
      .onConflictDoUpdate({
        target: users.discordId,
        set: {
          username: d.username,
          globalName: d.global_name ?? null,
          avatar: d.avatar ?? null,
          lastLoginAt: now,
          updatedAt: now,
        },
      })
      .returning();

    if (adminBootstrapIds().includes(d.id)) {
      const existing = await tx.query.adminUsers.findFirst({ where: eq(adminUsers.discordId, d.id) });
      if (!existing) {
        await tx.insert(adminUsers).values({ discordId: d.id, userId: user.id, role: "SUPER_ADMIN" });
        await audit({ actorType: "SYSTEM", action: "admin.bootstrap", entityType: "admin_user", entityId: d.id }, tx);
      }
    }
    // Link pre-created admin records (added by Discord ID before first login).
    await tx
      .update(adminUsers)
      .set({ userId: user.id })
      .where(sql`${adminUsers.discordId} = ${d.id} and ${adminUsers.userId} is null`);
    return user;
  });
}
