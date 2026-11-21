"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "components/cart/cart-provider";

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      className="relative top-0 grid size-10 shrink-0 place-items-center sm:size-11 rounded-full border border-border bg-white/5 text-white shadow-[0_4px_0_rgb(0_0_0/0.5)] transition-all hover:-top-0.5 hover:border-primary hover:bg-primary hover:text-black hover:shadow-[0_6px_0_var(--color-primary-dark),var(--shadow-glow)] active:top-1 cursor-pointer"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid size-[22px] place-items-center rounded-full border-2 border-background bg-red-500 text-[11px] font-black text-white shadow-[0_0_10px_rgb(239_68_68/0.5)]">
          {count > 99 ? "99" : count}
        </span>
      )}
    </button>
  );
}
