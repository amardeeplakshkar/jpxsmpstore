import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { adminUsers, users } from "db/schema";
import { ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";

export const GET = route(async () => {
  await requireAdminApi("admins.manage");
  const rows = await db.select({ admin: adminUsers, user: users }).from(adminUsers).leftJoin(users, eq(adminUsers.userId, users.id)).orderBy(asc(adminUsers.createdAt));
  return ok(rows);
});

const schema = z.object({ discordId: z.string().trim().regex(/^\d{5,25}$/, "Enter a numeric Discord user ID"), role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT"]) });

/** Grants admin access by Discord ID. The user does not need to have logged in yet. */
export const POST = route(async (req) => {
  const admin = await requireAdminApi("admins.manage");
  const input = await parseJson(req, schema);
  const user = await db.query.users.findFirst({ where: eq(users.discordId, input.discordId) });
  const [row] = await db
    .insert(adminUsers)
    .values({ discordId: input.discordId, role: input.role, userId: user?.id ?? null, createdBy: admin.id })
    .onConflictDoUpdate({ target: adminUsers.discordId, set: { role: input.role, isActive: true } })
    .returning();
  await audit({ actor: admin, action: "admin.grant", entityType: "admin_user", entityId: input.discordId, metadata: { role: input.role }, req });
  return ok(row, 201);
});
