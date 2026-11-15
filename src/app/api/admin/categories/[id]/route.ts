import { and, eq, ne } from "drizzle-orm";
import { db } from "db/client";
import { categories, products } from "db/schema";
import { ApiError, fail, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { categorySchema } from "app/api/admin/categories/route";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("categories.manage");
  const { id } = await params;
  const input = await parseJson(req, categorySchema);
  if (await db.query.categories.findFirst({ where: and(eq(categories.slug, input.slug), ne(categories.id, id)) })) throw new ApiError(409, "SLUG_TAKEN", "Slug already in use.");
  const [c] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
  if (!c) return fail(404, "NOT_FOUND", "Category not found.");
  await audit({ actor: admin, action: "category.update", entityType: "category", entityId: id, metadata: { name: c.name }, req });
  return ok(c);
});

/** Soft delete; products keep working and are simply uncategorised. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("categories.manage");
  const { id } = await params;
  const c = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!c) return fail(404, "NOT_FOUND", "Category not found.");
  await db.transaction(async (tx) => {
    await tx.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));
    await tx.update(categories).set({ deletedAt: new Date(), isActive: false, slug: `${c.slug}-deleted-${Date.now()}`.slice(0, 100) }).where(eq(categories.id, id));
    await audit({ actor: admin, action: "category.delete", entityType: "category", entityId: id, metadata: { name: c.name }, req }, tx);
  });
  return ok({ deleted: true });
});
