/** Cart lines live in a small first-party cookie so the server can read them on /checkout. Prices are never stored client-side. */
export const CART_COOKIE = "jpx_cart";
export const MAX_CART_LINES = 20;
export const MAX_QTY = 10;

export type CartLine = { slug: string; qty: number };

export type QtyRuleProduct = { type: string; allowMultiple?: boolean | null };

/**
 * Whether a product can be bought in multiples within one order.
 * Crates: always. Ranks: never. Coins and custom items: only when the admin enabled "Allow buying multiple".
 */
export function allowsMultiple(p: QtyRuleProduct): boolean {
  if (p.type === "CRATE") return true;
  if (p.type === "RANK") return false;
  return p.allowMultiple === true;
}

/** Largest quantity of one product allowed in a single order. */
export function maxQtyFor(p: QtyRuleProduct): number {
  return allowsMultiple(p) ? MAX_QTY : 1;
}

/** Turns untrusted input (query string, cookie, form) into a quantity between 1 and max. */
export function clampQty(raw: unknown, max: number = MAX_QTY): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.trunc(n)), Math.max(1, max));
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
