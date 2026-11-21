import { notFound } from "next/navigation";
import { CheckoutFlow } from "components/checkout/checkout-flow";
import { EmptyState } from "components/ui/empty-state";
import { requireUserPage } from "lib/auth/guards";
import { clampQty } from "lib/cart";
import { publicQuote, quoteCart } from "lib/orders/quote";
import { getSetting } from "lib/settings";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

/** "Buy now" checkout for a single product. Does not touch the cart. */
// Per-user page: always rendered on request (never cached).
export const dynamic = "force-dynamic";

export default async function BuyNowPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ qty?: string | string[] }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  // Quantity chosen on the product page. quoteCart re-applies the product's own limit (ranks 1, crates up to 10, others per admin toggle).
  const qty = clampQty(Array.isArray(sp.qty) ? sp.qty[0] : sp.qty);
  const user = await requireUserPage(qty > 1 ? `/checkout/${slug}?qty=${qty}` : `/checkout/${slug}`);
  if (!/^[a-z0-9-]{1,140}$/.test(slug)) notFound();
  const [quote, payment] = await Promise.all([quoteCart([{ slug, qty }]), getSetting("payment")]);
  if (quote.lines.length === 0) notFound();

  if (user.status === "BLOCKED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Account blocked" description="Your account cannot make purchases. Contact support on Discord if you think this is a mistake." />
      </div>
    );
  }
  if (!payment.upiId || !payment.qrEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Payments are temporarily unavailable" description="The store is not accepting payments right now. Please try again later." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1040px] px-5 py-12">
      <h1 className="mb-2 text-4xl font-black tracking-tight">Checkout</h1>
      <p className="mb-8 font-semibold text-muted">Secure UPI checkout. Your order is verified before delivery.</p>
      <div className="gateway">
        <CheckoutFlow quote={publicQuote(quote)} buyerName={user.globalName ?? user.username} source="single" />
      </div>
    </div>
  );
}
