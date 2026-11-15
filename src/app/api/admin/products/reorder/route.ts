import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { products } from "db/schema";
import { ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

/** Sets sort_order to the position in the submitted list. */
export const POST = route(async (req) => {
  const admin = await requireAdminApi("products.manage");
  const { ids } = await parseJson(req, schema);
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) await tx.update(products).set({ sortOrder: i * 10 }).where(eq(products.id, ids[i]));
    await audit({ actor: admin, action: "product.reorder", entityType: "product", metadata: { count: ids.length }, req }, tx);
  });
  return ok({ reordered: ids.length });
});
