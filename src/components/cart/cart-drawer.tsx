"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "components/cart/cart-provider";
import { api } from "lib/client-api";
import type { Quote } from "lib/orders/quote";
import { formatINR } from "lib/utils";

export function CartDrawer({ loggedIn }: { loggedIn: boolean }) {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [loading, setLoading] = React.useState(false);
  const key = JSON.stringify(lines);

  React.useEffect(() => {
    if (!open) return;
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<Quote>("/api/cart/quote", { method: "POST", json: { items: lines } })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const checkoutHref = loggedIn ? "/checkout" : `/api/auth/discord?returnTo=${encodeURIComponent("/checkout")}`;

  return (
    <>
      <div aria-hidden className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-[420px] flex-col border-l border-border bg-[#0b0f15] shadow-[-20px_0_50px_rgb(0_0_0/0.8)] transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-border px-7 py-6">
          <h2 className="flex items-center gap-3 text-xl font-black uppercase"><ShoppingCart className="size-5 text-primary" /> Your cart</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close cart" className="grid size-10 place-items-center rounded-full bg-white/5 transition hover:bg-red-500 cursor-pointer">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-7 py-6">
          {lines.length === 0 && (
            <div className="py-16 text-center">
              <ShoppingCart className="mx-auto mb-4 size-12 text-muted" />
              <p className="font-bold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted">Add ranks, crates or coins to buy them together.</p>
            </div>
          )}
          {loading && !quote && lines.length > 0 && (
            <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
          )}
          {quote?.unavailable.map((n) => (
            <p key={n} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{n} is no longer available. Remove it to continue.</p>
          ))}
          {quote?.lines.map((l) => (
            <div key={l.slug} className="flex gap-4 rounded-2xl border border-white/5 bg-surface p-4 transition hover:border-primary/30">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/40">
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] font-bold text-muted">{l.type}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="block truncate font-black text-white hover:text-primary">{l.name}</Link>
                <p className="text-xs font-bold text-muted">{[l.gameModeName, l.type === "CUSTOM" ? "Item" : l.type.charAt(0) + l.type.slice(1).toLowerCase()].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {l.maxQty > 1 ? (
                    <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-elevated">
                      <button type="button" aria-label="Decrease quantity" disabled={l.qty <= 1} onClick={() => setQty(l.slug, l.qty - 1)} className="grid size-8 place-items-center hover:bg-white/10 disabled:opacity-30 cursor-pointer"><Minus className="size-3.5" /></button>
                      <span className="w-8 text-center text-sm font-black">{l.qty}</span>
                      <button type="button" aria-label="Increase quantity" disabled={l.qty >= l.maxQty} onClick={() => setQty(l.slug, l.qty + 1)} className="grid size-8 place-items-center hover:bg-white/10 disabled:opacity-30 cursor-pointer"><Plus className="size-3.5" /></button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-muted">Qty 1</span>
                  )}
                  <div className="text-right">
                    <p className="font-black text-white">{formatINR(l.lineTotalPaise)}</p>
                    {l.lineRegularPaise > l.lineTotalPaise && <p className="text-xs font-bold text-slate-500 line-through">{formatINR(l.lineRegularPaise)}</p>}
                  </div>
                </div>
              </div>
              <button type="button" aria-label={`Remove ${l.name}`} onClick={() => remove(l.slug)} className="self-start text-muted transition hover:text-red-400 cursor-pointer"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {quote && quote.unavailable.length > 0 && (
            <button type="button" className="text-xs font-bold text-red-300 underline cursor-pointer" onClick={() => lines.filter((l) => !quote.lines.some((q) => q.slug === l.slug)).forEach((l) => remove(l.slug))}>
              Remove unavailable items
            </button>
          )}
        </div>

        {quote && quote.lines.length > 0 && (
          <footer className="space-y-3 border-t border-border bg-black/30 px-7 py-6">
            <div className="flex justify-between text-sm font-bold text-muted"><span>Subtotal</span><span>{formatINR(quote.subtotalPaise)}</span></div>
            {quote.discountPaise > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-400"><span>Discount</span><span>- {formatINR(quote.discountPaise)}</span></div>
            )}
            <div className="flex justify-between text-xl font-black"><span>Total</span><span>{formatINR(quote.totalPaise)}</span></div>
            {quote.unavailable.length > 0 ? (
              <p className="text-center text-xs font-bold text-red-300">Remove unavailable items to check out.</p>
            ) : (
              <a href={checkoutHref} className="btn3d btn3d-accent h-14 w-full text-sm">Checkout {formatINR(quote.totalPaise)}</a>
            )}
            {!loggedIn && <p className="text-center text-xs font-semibold text-muted">You&apos;ll log in with Discord first.</p>}
          </footer>
        )}
      </aside>
    </>
  );
}
