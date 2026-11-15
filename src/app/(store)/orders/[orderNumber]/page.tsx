import { notFound } from "next/navigation";
import { PaymentPanel } from "components/payments/payment-panel";
import { StatusBadge } from "components/ui/status-badge";
import { requireUserPage } from "lib/auth/guards";
import { getOwnedOrder, toCustomerOrder } from "lib/orders/service";
import { upiQrDataUrl } from "lib/payments/upi";
import { getSetting } from "lib/settings";
import { formatDateTime, formatINR } from "lib/utils";

export const metadata = { title: "Payment" };

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUserPage(`/orders/${orderNumber}`);
  const order = await getOwnedOrder(user.id, orderNumber.toUpperCase());
  if (!order || !order.payment) notFound();
  const cfg = await getSetting("payment");
  const view = toCustomerOrder(order);
  const payable = ["PENDING", "VERIFYING"].includes(order.paymentStatus) && order.fulfillmentStatus !== "CANCELLED";
  const qr = payable && cfg.qrEnabled ? await upiQrDataUrl(order.payment.upiUri) : null;

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="font-mono text-2xl font-black text-primary sm:text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.paymentStatus} prefix="Payment" />
          <StatusBadge status={order.fulfillmentStatus} prefix="Delivery" />
        </div>
      </div>

      <div className="gateway grid lg:grid-cols-[1fr_340px]">
        <PaymentPanel
          orderNumber={order.orderNumber}
          amountPaise={order.payment.amountPaise}
          upiId={order.payment.upiId}
          payeeName={order.payment.payeeName}
          upiUri={payable && cfg.qrEnabled ? order.payment.upiUri : null}
          qrDataUrl={qr}
          instructions={cfg.instructions}
          initialPaymentStatus={order.paymentStatus}
          initialFulfillmentStatus={order.fulfillmentStatus}
          expiresAt={order.paymentExpiresAt.toISOString()}
          screenshotEnabled={cfg.screenshotEnabled}
          maxScreenshotSizeMb={cfg.maxScreenshotSizeMb}
          evidenceRequestNote={view.evidenceRequestNote}
          screenshots={view.screenshots.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
        />

        <aside className="gateway-side space-y-4 border-t p-6 sm:p-8 lg:border-l lg:border-t-0" aria-label="Order details">
          <h2 className="text-sm font-extrabold uppercase text-slate-700">Order details</h2>
          <ul className="space-y-3">
            {view.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-muted">{item.type}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">{[item.gameModeName, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-sm font-bold">{formatINR(item.unitPricePaise * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <Row k="Purchase type" v={order.purchaseType === "GIFT" ? "Gift" : "For myself"} />
            <Row k="Minecraft username" v={order.minecraftUsername} />
            <Row k="Game edition" v={order.gameEdition === "JAVA" ? "Java" : "Bedrock"} />
            {order.giftNote && <Row k="Gift message" v={order.giftNote} />}
            <Row k="Subtotal" v={formatINR(order.subtotalPaise)} />
            <Row k="Discount" v={order.discountPaise ? `- ${formatINR(order.discountPaise)}` : formatINR(0)} />
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="text-accent">{formatINR(order.totalPaise)}</dd>
            </div>
          </dl>
          {view.timeline.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold">Timeline</h3>
              <ol className="space-y-2 text-xs">
                {view.timeline.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2 text-muted">
                    <span>
                      {t.kind === "PAYMENT" ? "Payment" : t.kind === "FULFILLMENT" ? "Delivery" : "Order"} {t.to ? t.to.toLowerCase() : "updated"}
                    </span>
                    <span>{formatDateTime(t.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
