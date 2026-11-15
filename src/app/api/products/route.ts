import { z } from "zod";
import { ok, parseQuery, route } from "lib/api";
import { listProducts, toPublicProduct } from "lib/products/queries";

const query = z.object({
  type: z.enum(["RANK", "CRATE", "COINS", "CUSTOM"]).optional(),
  category: z.string().max(100).optional(),
  featured: z.enum(["true", "false"]).optional(),
});

export const GET = route(async (req) => {
  const q = parseQuery(req, query);
  const products = await listProducts({ type: q.type, categorySlug: q.category, featured: q.featured === "true" });
  return ok(products.map(toPublicProduct));
});
