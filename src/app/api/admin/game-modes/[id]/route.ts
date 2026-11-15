import { and, eq, ne, notInArray } from "drizzle-orm";
import { db } from "db/client";
import { gameModes, products, type ProductType } from "db/schema";
import { ApiError, fail, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { gameModeSchema, RESERVED_MODE_SLUGS } from "lib/validation/game-mode";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("categories.manage");
  const { id } = await params;
  const input = await parseJson(req, gameModeSchema);
  if (RESERVED_MODE_SLUGS.has(input.slug)) throw new ApiError(422, "SLUG_RESERVED", "That slug is used by another store page. Pick a different one.");
  if (await db.query.gameModes.findFirst({ where: and(eq(gameModes.slug, input.slug), ne(gameModes.id, id)) })) throw new ApiError(409, "SLUG_TAKEN", "Slug already in use.");
  const blocked = await db
    .select({ name: products.name })
    .from(products)
    .where(and(eq(products.gameModeId, id), notInArray(products.type, input.allowedTypes as ProductType[])))
    .limit(3);
  if (blocked.length) {
    throw new ApiError(409, "MODE_HAS_PRODUCTS", `Move or delete these products first: ${blocked.map((b) => b.name).join(", ")}${blocked.length === 3 ? "..." : ""}`);
  }
  const [m] = await db.update(gameModes).set(input).where(eq(gameModes.id, id)).returning();
  if (!m) return fail(404, "NOT_FOUND", "Game mode not found.");
  await audit({ actor: admin, action: "game_mode.update", entityType: "game_mode", entityId: id, metadata: { name: m.name, allowedTypes: m.allowedTypes }, req });
  return ok(m);
});

/** Soft delete. Products stay in the store, unassigned (shown on the general Ranks/Crates/Coins pages). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("categories.manage");
  const { id } = await params;
  const m = await db.query.gameModes.findFirst({ where: eq(gameModes.id, id) });
  if (!m) return fail(404, "NOT_FOUND", "Game mode not found.");
  await db.transaction(async (tx) => {
    await tx.update(products).set({ gameModeId: null }).where(eq(products.gameModeId, id));
    await tx.update(gameModes).set({ deletedAt: new Date(), isActive: false, slug: `${m.slug}-deleted-${Date.now()}`.slice(0, 60) }).where(eq(gameModes.id, id));
    await audit({ actor: admin, action: "game_mode.delete", entityType: "game_mode", entityId: id, metadata: { name: m.name }, req }, tx);
  });
  return ok({ deleted: true });
});
