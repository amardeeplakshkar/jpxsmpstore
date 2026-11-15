import { ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { db } from "db/client";
import { products } from "db/schema";
import { listProductsAdmin } from "lib/admin/queries";
import { assertSlugFree, productValues, replaceGallery } from "lib/admin/products";
import { productInputSchema } from "lib/validation/product";

export const GET = route(async () => {
  await requireAdminApi("products.manage");
  const rows = await listProductsAdmin();
  return ok(rows.map((r) => ({ ...r.product, category: r.category })));
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi("products.manage");
  const input = await parseJson(req, productInputSchema);
  await assertSlugFree(input.slug);
  const product = await db.transaction(async (tx) => {
    const [p] = await tx.insert(products).values(productValues(input)).returning();
    await replaceGallery(tx, p.id, input.gallery);
    await audit({ actor: admin, action: "product.create", entityType: "product", entityId: p.id, metadata: { name: p.name, pricePaise: p.regularPricePaise }, req }, tx);
    return p;
  });
  return ok(product, 201);
});
