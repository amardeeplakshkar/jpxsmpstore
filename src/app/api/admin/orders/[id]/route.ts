import { after } from "next/server";
import { fail, ok, parseJson, route } from "lib/api";
import { notifyOrder, type OrderEvent } from "lib/notify/discord";
import { requireAdminApi } from "lib/auth/guards";
import { getOrderAdmin } from "lib/admin/queries";
import { orderActionSchema, runOrderAction } from "lib/admin/order-actions";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireAdminApi("orders.view");
  const { id } = await params;
  const order = await getOrderAdmin(id);
  if (!order) return fail(404, "ORDER_NOT_FOUND", "Order not found.");
  // Strip storage keys; screenshots are viewed through the authorised image route.
  return ok({ ...order, screenshots: order.screenshots.map(({ storageKey: _k, ...s }) => s) });
});

/** Admin order actions. Each action independently checks its own permission. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("orders.view");
  const { id } = await params;
  const input = await parseJson(req, orderActionSchema);
  const order = await runOrderAction(admin, id, input, req);
  const event: Partial<Record<typeof input.action, OrderEvent>> = {
    confirm_payment: "paid",
    reject_payment: "rejected",
    request_evidence: "evidence_requested",
    mark_fulfilled: "fulfilled",
    mark_failed: "failed",
    cancel: "cancelled",
    refund: "refunded",
  };
  const ev = event[input.action];
  if (ev) {
    const note = "reason" in input ? input.reason : "message" in input ? input.message : "note" in input ? (input.note ?? null) : "deliveryNotes" in input ? (input.deliveryNotes ?? null) : null;
    after(() => notifyOrder(order.id, ev, { note, by: admin.username }));
  }
  return ok({ id: order.id, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus });
});
