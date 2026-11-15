import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { products } from "db/schema";
import { fail, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { assertModeAllowsType, assertSlugFree, getProductForEdit, productValues, replaceGallery } from "lib/admin/products";
import { productInputSchema } from "lib/validation/product";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireAdminApi("products.manage");
  const p = await getProductForEdit((await params).id);
  return p ? ok(p) : fail(404, "NOT_FOUND", "Product not found.");
});

/** Full update. */
export const PUT = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("products.manage");
  const { id } = await params;
  const before = await getProductForEdit(id);
  if (!before) return fail(404, "NOT_FOUND", "Product not found.");
  const input = await parseJson(req, productInputSchema);
  await assertSlugFree(input.slug, id);
  await assertModeAllowsType(input.gameModeId, input.type);
  const product = await db.transaction(async (tx) => {
    const [p] = await tx.update(products).set(productValues(input)).where(eq(products.id, id)).returning();
    await replaceGallery(tx, id, input.gallery);
    await audit(
      {
        actor: admin,
        action: "product.update",
        entityType: "product",
        entityId: id,
        metadata: { name: p.name, priceBefore: before.regularPricePaise, priceAfter: p.regularPricePaise, saleBefore: before.salePricePaise, saleAfter: p.salePricePaise },
        req,
      },
      tx,
    );
    return p;
  });
  return ok(product);
});

const quickSchema = z
  .object({ isActive: z.boolean().optional(), isFeatured: z.boolean().optional(), sortOrder: z.number().int().min(-10000).max(10000).optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** Quick toggles from the product table. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("products.manage");
  const { id } = await params;
  const input = await parseJson(req, quickSchema);
  const [p] = await db.update(products).set(input).where(eq(products.id, id)).returning();
  if (!p) return fail(404, "NOT_FOUND", "Product not found.");
  await audit({ actor: admin, action: "product.quick_update", entityType: "product", entityId: id, metadata: input, req });
  return ok(p);
});

/** Soft delete: keeps order snapshots intact and frees the slug. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("products.manage");
  const { id } = await params;
  const p = await getProductForEdit(id);
  if (!p) return fail(404, "NOT_FOUND", "Product not found.");
  await db
    .update(products)
    .set({ deletedAt: new Date(), isActive: false, isFeatured: false, slug: `${p.slug}-deleted-${Date.now()}`.slice(0, 140) })
    .where(eq(products.id, id));
  await audit({ actor: admin, action: "product.delete", entityType: "product", entityId: id, metadata: { name: p.name }, req });
  return ok({ deleted: true });
});
