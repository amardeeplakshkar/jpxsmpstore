import { fail, ok, route } from "lib/api";
import { requireUserApi } from "lib/auth/guards";
import { getOwnedOrder } from "lib/orders/service";
import { upiQrDataUrl } from "lib/payments/upi";
import { getSetting } from "lib/settings";

/** Payment instructions for the order owner. The UPI URI was generated server-side at order creation. */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUserApi();
  const { id } = await params;
  const order = await getOwnedOrder(user.id, id.toUpperCase());
  if (!order || !order.payment) return fail(404, "ORDER_NOT_FOUND", "Order not found.");
  const cfg = await getSetting("payment");
  const payable = order.paymentStatus === "PENDING" || order.paymentStatus === "VERIFYING";
  return ok({
    orderNumber: order.orderNumber,
    amountPaise: order.payment.amountPaise,
    upiId: order.payment.upiId,
    payeeName: order.payment.payeeName,
    upiUri: payable && cfg.qrEnabled ? order.payment.upiUri : null,
    qrDataUrl: payable && cfg.qrEnabled ? await upiQrDataUrl(order.payment.upiUri) : null,
    instructions: cfg.instructions,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    expiresAt: order.paymentExpiresAt,
    screenshotEnabled: cfg.screenshotEnabled,
  });
});
