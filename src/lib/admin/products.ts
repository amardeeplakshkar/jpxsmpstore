import { and, eq, isNull, ne } from "drizzle-orm";
import { db, type Tx } from "db/client";
import { productImages, products } from "db/schema";
import { ApiError } from "lib/api";
import type { ProductInput } from "lib/validation/product";

export async function assertSlugFree(slug: string, exceptId?: string) {
  const existing = await db.query.products.findFirst({
    where: exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug),
    columns: { id: true },
  });
  if (existing) throw new ApiError(409, "SLUG_TAKEN", "Another product already uses this slug.");
}

export function productValues(input: ProductInput) {
  const { gallery: _g, ...rest } = input;
  return { ...rest, metadata: input.metadata as Record<string, unknown> };
}

export async function replaceGallery(tx: Tx, productId: string, gallery: string[]) {
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (gallery.length) {
    await tx.insert(productImages).values(gallery.map((url, i) => ({ productId, url, sortOrder: i })));
  }
}

export async function getProductForEdit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (
    (await db.query.products.findFirst({
      where: and(eq(products.id, id), isNull(products.deletedAt)),
      with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } },
    })) ?? null
  );
}
