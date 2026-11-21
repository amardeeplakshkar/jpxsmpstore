"use client";

import * as React from "react";
import { Zap } from "lucide-react";
import { useSession } from "components/auth/session-provider";
import { AddToCartButton } from "components/cart/add-to-cart-button";
import { QuantityStepper } from "components/cart/quantity-stepper";
import { formatINR } from "lib/utils";

/** Product page buy box actions: quantity picker (if allowed), Add to cart, and Buy now carrying the same quantity. */
export function ProductPurchase({ slug, maxQty, unitPaise }: { slug: string; maxQty: number; unitPaise: number }) {
  const { ready, user } = useSession();
  const loggedIn = Boolean(user);
  const [qty, setQty] = React.useState(1);
  const checkoutPath = qty > 1 ? `/checkout/${slug}?qty=${qty}` : `/checkout/${slug}`;
  const buyHref = loggedIn ? checkoutPath : `/api/auth/discord?returnTo=${encodeURIComponent(checkoutPath)}`;

  return (
    <div className="mb-4 flex flex-col gap-4">
      {maxQty > 1 && (
        <div className="flex items-center gap-3">
          <QuantityStepper value={qty} max={maxQty} onChange={setQty} />
          <div className="text-sm font-bold text-muted">
            {qty > 1 ? (
              <>
                Total <span className="text-white">{formatINR(unitPaise * qty)}</span>
              </>
            ) : (
              `Up to ${maxQty} per order`
            )}
          </div>
        </div>
      )}
      <AddToCartButton slug={slug} maxQty={maxQty} qty={qty} onAdded={() => setQty(1)} variant="accent" className="h-14 w-full text-sm" />
      <a href={buyHref} className="btn3d btn3d-dark h-14 w-full text-sm">
        <Zap className="size-4" /> {qty > 1 ? `Buy ${qty} now` : "Buy now"}
      </a>
      {ready && !loggedIn && <p className="text-center text-xs font-semibold text-muted">You&apos;ll log in with Discord before checkout.</p>}
    </div>
  );
}
