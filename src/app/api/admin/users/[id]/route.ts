import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { sessions, users } from "db/schema";
import { ApiError, fail, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { getUserAdmin } from "lib/admin/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireAdminApi("users.view");
  const data = await getUserAdmin((await params).id);
  return data ? ok(data) : fail(404, "NOT_FOUND", "User not found.");
});

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("unblock") }),
]);

/** Block/unblock. Blocking revokes all sessions immediately. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("users.block");
  const { id } = await params;
  const input = await parseJson(req, schema);
  if (id === admin.id) throw new ApiError(409, "SELF", "You cannot block yourself.");
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return fail(404, "NOT_FOUND", "User not found.");
  await db.transaction(async (tx) => {
    if (input.action === "block") {
      await tx.update(users).set({ status: "BLOCKED", blockedReason: input.reason }).where(eq(users.id, id));
      await tx.delete(sessions).where(eq(sessions.userId, id));
    } else {
      await tx.update(users).set({ status: "ACTIVE", blockedReason: null }).where(eq(users.id, id));
    }
    await audit({ actor: admin, action: `user.${input.action}`, entityType: "user", entityId: id, metadata: { discordId: user.discordId, ...input }, req }, tx);
  });
  return ok({ status: input.action === "block" ? "BLOCKED" : "ACTIVE" });
});
