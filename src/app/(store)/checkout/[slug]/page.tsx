import { notFound } from "next/navigation";
import { CheckoutFlow } from "components/checkout/checkout-flow";
import { EmptyState } from "components/ui/empty-state";
import { requireUserPage } from "lib/auth/guards";
import { getProductBySlug } from "lib/products/queries";
import { getSetting } from "lib/settings";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUserPage(`/checkout/${slug}`);
  const [product, payment] = await Promise.all([getProductBySlug(slug), getSetting("payment")]);
  if (!product) notFound();
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-black">Checkout</h1>
      <CheckoutFlow
        product={{
          slug: product.slug,
          name: product.name,
          type: product.type,
          imageUrl: product.imageUrl,
          regularPricePaise: product.regularPricePaise,
          salePricePaise: product.salePricePaise,
          javaAvailable: product.javaAvailable,
          bedrockAvailable: product.bedrockAvailable,
        }}
        buyerName={user.globalName ?? user.username}
      />
    </div>
  );
}
