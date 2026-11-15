"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "components/cart/cart-provider";
import { cn } from "lib/utils";

export function AddToCartButton({ slug, maxQty, className, label = "Add to cart", variant = "dark" }: { slug: string; maxQty: number; className?: string; label?: string; variant?: "dark" | "accent" }) {
  const { add } = useCart();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(slug, 1, maxQty);
      }}
      aria-label={label || "Add to cart"}
      title="Add to cart"
      className={cn("btn3d cursor-pointer", variant === "dark" ? "btn3d-dark" : "btn3d-accent", className)}
    >
      <ShoppingCart className="size-4" />
      {label}
    </button>
  );
}
