"use client";

import * as React from "react";
import { toast } from "sonner";
import { CART_COOKIE, MAX_CART_LINES, parseCart, serializeCart, type CartLine } from "lib/cart";

type CartCtx = {
  lines: CartLine[];
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (slug: string, qty?: number, maxQty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const Ctx = React.createContext<CartCtx | null>(null);

function readCookie(): CartLine[] {
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${CART_COOKIE}=`));
  return parseCart(m ? m.slice(CART_COOKIE.length + 1) : null);
}
function writeCookie(lines: CartLine[]) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = lines.length
    ? `${CART_COOKIE}=${serializeCart(lines)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
    : `${CART_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setLines(readCookie());
    // Keep tabs in sync when the cart changes elsewhere.
    const onFocus = () => setLines(readCookie());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const commit = React.useCallback((next: CartLine[]) => {
    writeCookie(next);
    setLines(next);
  }, []);

  const value = React.useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((a, l) => a + l.qty, 0),
      open,
      setOpen,
      add: (slug, qty = 1, maxQty = 10) => {
        const current = readCookie();
        const existing = current.find((l) => l.slug === slug);
        if (!existing && current.length >= MAX_CART_LINES) {
          toast.error(`Your cart can hold up to ${MAX_CART_LINES} different items.`);
          return;
        }
        if (existing && existing.qty >= maxQty) {
          toast.info(maxQty === 1 ? "This item is already in your cart." : "You already have the maximum quantity in your cart.");
          setOpen(true);
          return;
        }
        const next = existing ? current.map((l) => (l.slug === slug ? { ...l, qty: Math.min(maxQty, l.qty + qty) } : l)) : [...current, { slug, qty: Math.min(maxQty, qty) }];
        commit(next);
        toast.success("Added to cart");
        setOpen(true);
      },
      setQty: (slug, qty) => commit(readCookie().map((l) => (l.slug === slug ? { ...l, qty: Math.max(1, qty) } : l))),
      remove: (slug) => commit(readCookie().filter((l) => l.slug !== slug)),
      clear: () => commit([]),
    }),
    [lines, open, commit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
