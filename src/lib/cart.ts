/** Cart lines live in a small first-party cookie so the server can read them on /checkout. Prices are never stored client-side. */
export const CART_COOKIE = "jpx_cart";
export const MAX_CART_LINES = 20;
export const MAX_QTY = 10;

export type CartLine = { slug: string; qty: number };

/**
 * How many of one product a player can buy in a single order.
 * - Crates: always multiple (up to MAX_QTY).
 * - Ranks: always 1.
 * - Coins and custom items: multiple only when the admin turned on "Allow buying multiple".
 */
export function maxQtyFor(type: string, allowMultiple = false): number {
  if (type === "CRATE") return MAX_QTY;
  if (type === "RANK") return 1;
  return allowMultiple ? MAX_QTY : 1;
}

export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!Array.isArray(data)) return [];
    const out: CartLine[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const slug = String((item as { s?: unknown }).s ?? "");
      const qty = Number((item as { q?: unknown }).q ?? 1);
      if (!/^[a-z0-9-]{1,140}$/.test(slug) || !Number.isInteger(qty) || qty < 1) continue;
      if (out.some((l) => l.slug === slug)) continue;
      out.push({ slug, qty: Math.min(qty, MAX_QTY) });
      if (out.length >= MAX_CART_LINES) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeCart(lines: CartLine[]): string {
  return encodeURIComponent(JSON.stringify(lines.slice(0, MAX_CART_LINES).map((l) => ({ s: l.slug, q: l.qty }))));
}
