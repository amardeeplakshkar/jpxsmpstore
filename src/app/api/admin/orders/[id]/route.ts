import { fail, ok, parseJson, route } from "lib/api";
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
  return ok({ id: order.id, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus });
});
