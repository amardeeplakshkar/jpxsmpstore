"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "components/cart/cart-provider";
import { QtyStepper } from "components/cart/qty-stepper";
import { cn } from "lib/utils";

/**
 * Add-to-cart button. When the product can be bought in multiples (maxQty > 1) a - / + quantity
 * picker is shown next to it and the chosen amount is added in one go.
 */
export function AddToCartButton({ slug, maxQty, className, label = "Add to cart", variant = "dark" }: { slug: string; maxQty: number; className?: string; label?: string; variant?: "dark" | "accent" }) {
  const { add } = useCart();
  const [qty, setQty] = React.useState(1);
  const button = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(slug, qty, maxQty);
        setQty(1);
      }}
      aria-label={label || (qty > 1 ? `Add ${qty} to cart` : "Add to cart")}
      title={qty > 1 ? `Add ${qty} to cart` : "Add to cart"}
      className={cn("btn3d cursor-pointer", variant === "dark" ? "btn3d-dark" : "btn3d-accent", className)}
    >
      <ShoppingCart className="size-4" />
      {label}
    </button>
  );
  if (maxQty <= 1) return button;
  return (
    <div className="flex items-center gap-2">
      <QtyStepper value={qty} max={maxQty} onChange={setQty} size={label ? "md" : "sm"} className={label ? "h-14" : "h-12"} />
      {button}
    </div>
  );
}
