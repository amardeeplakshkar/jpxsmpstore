/**
 * Pure pricing rules shared by the storefront, cart quotes and order creation, so the price a
 * customer sees is exactly the price the server charges. All amounts are integer paise.
 *
 * Rules:
 * - A product's own sale price (if lower than regular) always applies.
 * - An active store-wide discount applies only to products with discountEligible = true.
 * - Discounts never stack: the customer gets whichever price is lower.
 */
export type StoreDiscount = { percent: number; label: string; endsAt: string | null } | null;

export type DiscountSettingLike = { enabled: boolean; percent: number; label: string; endsAt: string };

/** endsAt is stored as India-time wall clock "YYYY-MM-DDTHH:mm". */
export function discountEndDate(endsAt: string): Date | null {
  if (!endsAt) return null;
  const d = new Date(`${endsAt}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function activeStoreDiscount(s: DiscountSettingLike, now: Date = new Date()): StoreDiscount {
  if (!s.enabled || s.percent <= 0) return null;
  const end = discountEndDate(s.endsAt);
  if (end && end.getTime() <= now.getTime()) return null;
  return { percent: Math.min(90, Math.max(1, Math.floor(s.percent))), label: s.label, endsAt: end ? end.toISOString() : null };
}

export type PriceableProduct = { regularPricePaise: number; salePricePaise: number | null; discountEligible?: boolean };

export type PriceBreakdown = {
  regularPaise: number;
  unitPaise: number;
  savedPaise: number;
  percentOff: number;
  source: "none" | "sale" | "store";
};

export function priceProduct(p: PriceableProduct, discount: StoreDiscount): PriceBreakdown {
  const regular = p.regularPricePaise;
  let unit = regular;
  let source: PriceBreakdown["source"] = "none";
  if (p.salePricePaise !== null && p.salePricePaise >= 0 && p.salePricePaise < regular) {
    unit = p.salePricePaise;
    source = "sale";
  }
  if (discount && p.discountEligible !== false) {
    const store = regular - Math.round((regular * discount.percent) / 100);
    if (store < unit) {
      unit = store;
      source = "store";
    }
  }
  unit = Math.max(0, unit);
  const saved = regular - unit;
  return { regularPaise: regular, unitPaise: unit, savedPaise: saved, percentOff: regular > 0 ? Math.round((saved / regular) * 100) : 0, source };
}
