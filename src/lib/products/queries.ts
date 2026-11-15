import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "db/client";
import { announcements, categories, gameModes, products, type ProductType } from "db/schema";
import { getSetting } from "lib/settings";
import { activeStoreDiscount, priceProduct, type StoreDiscount } from "lib/pricing";

const visible = and(eq(products.isActive, true), isNull(products.deletedAt));

export async function listProducts(opts: { type?: ProductType; categorySlug?: string; featured?: boolean; limit?: number; gameModeId?: string } = {}) {
  const conditions = [visible];
  if (opts.gameModeId) conditions.push(eq(products.gameModeId, opts.gameModeId));
  if (opts.type) conditions.push(eq(products.type, opts.type));
  if (opts.featured) conditions.push(eq(products.isFeatured, true));
  if (opts.categorySlug) conditions.push(eq(categories.slug, opts.categorySlug));
  const rows = await db
    .select({ product: products, category: categories, gameMode: gameModes })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(gameModes, eq(products.gameModeId, gameModes.id))
    .where(and(...conditions))
    .orderBy(asc(products.sortOrder), asc(products.createdAt))
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r.product, category: r.category, gameMode: r.gameMode && !r.gameMode.deletedAt ? r.gameMode : null }));
}
export type ListedProduct = Awaited<ReturnType<typeof listProducts>>[number];

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), visible),
    with: { category: true, gameMode: true, images: { orderBy: (img, { asc: a }) => [a(img.sortOrder)] } },
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

export async function listGameModes() {
  return db
    .select()
    .from(gameModes)
    .where(and(eq(gameModes.isActive, true), isNull(gameModes.deletedAt)))
    .orderBy(asc(gameModes.sortOrder), asc(gameModes.name));
}
export type GameMode = Awaited<ReturnType<typeof listGameModes>>[number];

export async function getGameModeBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const m = await db.query.gameModes.findFirst({ where: and(eq(gameModes.slug, slug), eq(gameModes.isActive, true), isNull(gameModes.deletedAt)) });
  return m ?? null;
}

export async function getStoreDiscount(): Promise<StoreDiscount> {
  return activeStoreDiscount(await getSetting("discount"));
}

/** Card-ready product data with server-computed prices. */
export function toCardData(p: ListedProduct, discount: StoreDiscount) {
  const price = priceProduct(p, discount);
  return {
    name: p.name,
    slug: p.slug,
    type: p.type,
    shortDescription: p.shortDescription,
    imageUrl: p.imageUrl,
    regularPricePaise: p.regularPricePaise,
    unitPricePaise: price.unitPaise,
    savedPaise: price.savedPaise,
    percentOff: price.percentOff,
    javaAvailable: p.javaAvailable,
    bedrockAvailable: p.bedrockAvailable,
    isFeatured: p.isFeatured,
    gameMode: p.gameMode ? { name: p.gameMode.name, slug: p.gameMode.slug, color: p.gameMode.accentColor } : null,
    perks: p.type === "RANK" && Array.isArray((p.metadata as { perks?: unknown }).perks) ? ((p.metadata as { perks: string[] }).perks.slice(0, 4)) : [],
  };
}
