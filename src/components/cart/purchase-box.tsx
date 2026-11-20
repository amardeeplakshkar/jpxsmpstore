"use client";

import * as React from "react";
import { ShoppingCart, Zap } from "lucide-react";
import { useCart } from "components/cart/cart-provider";
import { QtyStepper } from "components/cart/qty-stepper";
import { formatINR } from "lib/utils";

/** Product page actions: quantity picker (when allowed), Add to cart, and Buy now with the same quantity. */
export function PurchaseBox({ slug, maxQty, unitPaise, loggedIn }: { slug: string; maxQty: number; unitPaise: number; loggedIn: boolean }) {
  const { add } = useCart();
  const [qty, setQty] = React.useState(1);
  const checkoutPath = qty > 1 ? `/checkout/${slug}?qty=${qty}` : `/checkout/${slug}`;
  const buyHref = loggedIn ? checkoutPath : `/api/auth/discord?returnTo=${encodeURIComponent(checkoutPath)}`;
  return (
    <div className="mb-4 flex flex-col gap-4">
      {maxQty > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-muted">Quantity</span>
          <div className="flex items-center gap-3">
            {qty > 1 && <span className="text-sm font-black text-white">{formatINR(unitPaise * qty)}</span>}
            <QtyStepper value={qty} max={maxQty} onChange={setQty} />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          add(slug, qty, maxQty);
          setQty(1);
        }}
        className="btn3d btn3d-accent h-14 w-full cursor-pointer text-sm"
      >
        <ShoppingCart className="size-4" /> {qty > 1 ? `Add ${qty} to cart` : "Add to cart"}
      </button>
      <a href={buyHref} className="btn3d btn3d-dark h-14 w-full text-sm">
        <Zap className="size-4" /> {qty > 1 ? `Buy ${qty} now` : "Buy now"}
      </a>
    </div>
  );
}
