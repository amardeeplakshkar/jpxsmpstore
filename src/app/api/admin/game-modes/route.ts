import { asc, eq, isNull } from "drizzle-orm";
import { db } from "db/client";
import { gameModes } from "db/schema";
import { ApiError, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { gameModeSchema, RESERVED_MODE_SLUGS } from "lib/validation/game-mode";

export const GET = route(async () => {
  await requireAdminApi("categories.manage");
  return ok(await db.select().from(gameModes).where(isNull(gameModes.deletedAt)).orderBy(asc(gameModes.sortOrder)));
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi("categories.manage");
  const input = await parseJson(req, gameModeSchema);
  if (RESERVED_MODE_SLUGS.has(input.slug)) throw new ApiError(422, "SLUG_RESERVED", "That slug is used by another store page. Pick a different one.");
  if (await db.query.gameModes.findFirst({ where: eq(gameModes.slug, input.slug) })) throw new ApiError(409, "SLUG_TAKEN", "Slug already in use.");
  const [m] = await db.insert(gameModes).values(input).returning();
  await audit({ actor: admin, action: "game_mode.create", entityType: "game_mode", entityId: m.id, metadata: { name: m.name }, req });
  return ok(m, 201);
});
