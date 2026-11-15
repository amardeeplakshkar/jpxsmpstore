import { ok, route } from "lib/api";
import { listCategories } from "lib/products/queries";

export const GET = route(async () => {
  const cats = await listCategories();
  return ok(cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, productType: c.productType })));
});
