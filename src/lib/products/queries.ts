import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "db/client";
import { announcements, categories, products, type ProductType } from "db/schema";

const visible = and(eq(products.isActive, true), isNull(products.deletedAt));

export async function listProducts(opts: { type?: ProductType; categorySlug?: string; featured?: boolean; limit?: number } = {}) {
  const conditions = [visible];
  if (opts.type) conditions.push(eq(products.type, opts.type));
  if (opts.featured) conditions.push(eq(products.isFeatured, true));
  if (opts.categorySlug) conditions.push(eq(categories.slug, opts.categorySlug));
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(asc(products.sortOrder), asc(products.createdAt))
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r.product, category: r.category }));
}
export type ListedProduct = Awaited<ReturnType<typeof listProducts>>[number];

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), visible),
    with: { category: true, images: { orderBy: (img, { asc: a }) => [a(img.sortOrder)] } },
  });
  return product ?? null;
}

export async function listCategories() {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listActiveAnnouncements() {
  const now = new Date();
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        isNull(announcements.deletedAt),
        sql`(${announcements.startsAt} is null or ${announcements.startsAt} <= ${now})`,
        sql`(${announcements.endsAt} is null or ${announcements.endsAt} >= ${now})`,
      ),
    )
    .orderBy(desc(announcements.isPinned), asc(announcements.sortOrder), desc(announcements.createdAt))
    .limit(10);
}

/** Shape safe to send to the browser. */
export function toPublicProduct(p: ListedProduct) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    shortDescription: p.shortDescription,
    description: p.description,
    imageUrl: p.imageUrl,
    regularPricePaise: p.regularPricePaise,
    salePricePaise: p.salePricePaise,
    javaAvailable: p.javaAvailable,
    bedrockAvailable: p.bedrockAvailable,
    metadata: p.metadata,
    isFeatured: p.isFeatured,
    category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
  };
}
