import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { adminUsers } from "db/schema";
import { ApiError, fail, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";

const schema = z.object({ role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT"]).optional(), isActive: z.boolean().optional() });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdminApi("admins.manage");
  const { id } = await params;
  const input = await parseJson(req, schema);
  const target = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, id) });
  if (!target) return fail(404, "NOT_FOUND", "Admin not found.");
  if (target.discordId === admin.discordId) throw new ApiError(409, "SELF", "You cannot change your own admin role.");
  const demoting = target.role === "SUPER_ADMIN" && (input.isActive === false || (input.role && input.role !== "SUPER_ADMIN"));
  if (demoting) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(adminUsers)
      .where(and(eq(adminUsers.role, "SUPER_ADMIN"), eq(adminUsers.isActive, true), ne(adminUsers.id, id)));
    if (n === 0) throw new ApiError(409, "LAST_SUPER_ADMIN", "At least one active SUPER_ADMIN is required.");
  }
  const [row] = await db.update(adminUsers).set(input).where(eq(adminUsers.id, id)).returning();
  await audit({ actor: admin, action: "admin.update", entityType: "admin_user", entityId: target.discordId, metadata: input, req });
  return ok(row);
});
