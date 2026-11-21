"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "components/cart/cart-provider";
import { QuantityStepper } from "components/cart/quantity-stepper";
import { cn } from "lib/utils";

type Props = {
  slug: string;
  maxQty: number;
  className?: string;
  label?: string;
  variant?: "dark" | "accent";
  /** Controlled quantity (product page). When omitted the button manages its own stepper (product cards). */
  qty?: number;
  onAdded?: () => void;
};

export function AddToCartButton({ slug, maxQty, className, label = "Add to cart", variant = "dark", qty: controlledQty, onAdded }: Props) {
  const { add } = useCart();
  const [ownQty, setOwnQty] = React.useState(1);
  const controlled = controlledQty !== undefined;
  const qty = Math.min(maxQty, Math.max(1, controlled ? controlledQty : ownQty));
  const text = label && qty > 1 ? `${label} (${qty})` : label;

  const button = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(slug, qty, maxQty);
        if (!controlled) setOwnQty(1);
        onAdded?.();
      }}
      aria-label={qty > 1 ? `Add ${qty} to cart` : "Add to cart"}
      title={qty > 1 ? `Add ${qty} to cart` : "Add to cart"}
      className={cn("btn3d cursor-pointer", variant === "dark" ? "btn3d-dark" : "btn3d-accent", className)}
    >
      <ShoppingCart className="size-4" />
      {text}
    </button>
  );

  // Self-managed stepper only when this product can be bought in multiples.
  if (controlled || maxQty <= 1) return button;
  return (
    <div className="flex items-center gap-2">
      <QuantityStepper value={ownQty} max={maxQty} onChange={setOwnQty} size="compact" />
      {button}
    </div>
  );
}
