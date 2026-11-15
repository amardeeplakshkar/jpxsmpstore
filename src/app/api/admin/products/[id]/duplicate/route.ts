import { db } from "db/client";
import { products } from "db/schema";
import { fail, ok, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { getProductForEdit, replaceGallery } from "lib/admin/products";

/** Creates an inactive copy with a unique slug. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdminApi("products.manage");
  const { id } = await params;
  const src = await getProductForEdit(id);
  if (!src) return fail(404, "NOT_FOUND", "Product not found.");
  const suffix = Math.random().toString(36).slice(2, 6);
  const copy = await db.transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, images, ...rest } = src;
    const [p] = await tx
      .insert(products)
      .values({ ...rest, name: `${src.name} (copy)`.slice(0, 120), slug: `${src.slug}-copy-${suffix}`.slice(0, 140), isActive: false, isFeatured: false })
      .returning();
    await replaceGallery(tx, p.id, images.map((i) => i.url));
    await audit({ actor: admin, action: "product.duplicate", entityType: "product", entityId: p.id, metadata: { sourceId: id }, req }, tx);
    return p;
  });
  return ok(copy, 201);
});
