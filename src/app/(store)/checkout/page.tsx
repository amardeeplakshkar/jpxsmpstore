import Link from "next/link";
import { cookies } from "next/headers";
import { ShoppingCart } from "lucide-react";
import { CheckoutFlow } from "components/checkout/checkout-flow";
import { EmptyState } from "components/ui/empty-state";
import { requireUserPage } from "lib/auth/guards";
import { CART_COOKIE, parseCart } from "lib/cart";
import { publicQuote, quoteCart } from "lib/orders/quote";
import { getSetting } from "lib/settings";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

/** Cart checkout. The cart cookie only holds slugs and quantities; everything is priced here on the server. */
// Per-user page: always rendered on request (never cached).
export const dynamic = "force-dynamic";

export default async function CartCheckoutPage() {
  const user = await requireUserPage("/checkout");
  const lines = parseCart((await cookies()).get(CART_COOKIE)?.value);
  const [quote, payment] = await Promise.all([quoteCart(lines), getSetting("payment")]);

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

  if (quote.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState icon={<ShoppingCart className="size-6" />} title="Your cart is empty" description="Add something from the store first." action={<Link href="/" className="btn3d btn3d-accent h-12 px-6 text-sm">Browse the store</Link>} />
      </div>
    );
  }
  if (quote.unavailable.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Some items are no longer available" description={`Remove ${quote.unavailable.join(", ")} from your cart, then check out again.`} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1040px] px-5 py-12">
      <h1 className="mb-2 text-4xl font-black tracking-tight">Checkout</h1>
      <p className="mb-8 font-semibold text-muted">Secure UPI checkout. One payment for everything in your cart.</p>
      <div className="gateway">
        <CheckoutFlow quote={publicQuote(quote)} buyerName={user.globalName ?? user.username} source="cart" />
      </div>
    </div>
  );
}
