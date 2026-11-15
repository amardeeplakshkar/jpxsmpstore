import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { categories } from "db/schema";
import { ApiError, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { listCategoriesAdmin } from "lib/admin/queries";

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(100),
  description: z.string().max(1000).nullable().default(null),
  productType: z.enum(["RANK", "CRATE", "COINS", "CUSTOM"]).nullable().default(null),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
  isActive: z.boolean().default(true),
});

export const GET = route(async () => {
  await requireAdminApi("categories.manage");
  return ok(await listCategoriesAdmin());
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi("categories.manage");
  const input = await parseJson(req, categorySchema);
  if (await db.query.categories.findFirst({ where: eq(categories.slug, input.slug) })) throw new ApiError(409, "SLUG_TAKEN", "Slug already in use.");
  const [c] = await db.insert(categories).values(input).returning();
  await audit({ actor: admin, action: "category.create", entityType: "category", entityId: c.id, metadata: { name: c.name }, req });
  return ok(c, 201);
});
