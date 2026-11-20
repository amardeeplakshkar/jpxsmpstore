import { and, inArray, isNull } from "drizzle-orm";
import { db } from "db/client";
import { products } from "db/schema";
import { maxQtyFor, type CartLine } from "lib/cart";
import { getStoreDiscount } from "lib/products/queries";
import { priceProduct, type StoreDiscount } from "lib/pricing";

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  type: string;
  imageUrl: string | null;
  gameModeName: string | null;
  categoryName: string | null;
  qty: number;
  maxQty: number;
  regularPaise: number;
  unitPaise: number;
  lineRegularPaise: number;
  lineTotalPaise: number;
  javaAvailable: boolean;
  bedrockAvailable: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  unavailable: string[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  javaAvailable: boolean;
  bedrockAvailable: boolean;
  discount: StoreDiscount;
};

/** Prices a cart entirely from the database. Inactive/deleted products are reported, not priced. */
export async function quoteCart(input: CartLine[], discount?: StoreDiscount): Promise<Quote & { raw: Map<string, typeof products.$inferSelect & { category: { name: string } | null; gameMode: { name: string } | null }> }> {
  const d = discount === undefined ? await getStoreDiscount() : discount;
  const slugs = [...new Set(input.map((l) => l.slug))];
  const rows = slugs.length
    ? await db.query.products.findMany({
        where: and(inArray(products.slug, slugs), isNull(products.deletedAt)),
        with: { category: true, gameMode: true },
      })
    : [];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const lines: QuoteLine[] = [];
  const unavailable: string[] = [];
  for (const l of input) {
    const p = bySlug.get(l.slug);
    if (!p || !p.isActive || (p.gameMode && (p.gameMode.deletedAt || !p.gameMode.isActive))) {
      unavailable.push(p?.name ?? l.slug);
      continue;
    }
    const price = priceProduct(p, d);
    const max = maxQtyFor(p.type, p.allowMultiple);
    const qty = Math.max(1, Math.min(l.qty, max));
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      type: p.type,
      imageUrl: p.imageUrl,
      gameModeName: p.gameMode?.name ?? null,
      categoryName: p.category?.name ?? null,
      qty,
      maxQty: max,
      regularPaise: price.regularPaise,
      unitPaise: price.unitPaise,
      lineRegularPaise: price.regularPaise * qty,
      lineTotalPaise: price.unitPaise * qty,
      javaAvailable: p.javaAvailable,
      bedrockAvailable: p.bedrockAvailable,
    });
  }
  const subtotal = lines.reduce((a, l) => a + l.lineRegularPaise, 0);
  const total = lines.reduce((a, l) => a + l.lineTotalPaise, 0);
  return {
    lines,
    unavailable,
    subtotalPaise: subtotal,
    discountPaise: subtotal - total,
    totalPaise: total,
    javaAvailable: lines.length > 0 && lines.every((l) => l.javaAvailable),
    bedrockAvailable: lines.length > 0 && lines.every((l) => l.bedrockAvailable),
    discount: d,
    raw: new Map(rows.map((r) => [r.slug, r])),
  };
}

export function publicQuote(q: Quote): Quote {
  const { lines, unavailable, subtotalPaise, discountPaise, totalPaise, javaAvailable, bedrockAvailable, discount } = q;
  return { lines, unavailable, subtotalPaise, discountPaise, totalPaise, javaAvailable, bedrockAvailable, discount };
}
