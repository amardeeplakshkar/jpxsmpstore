import { fail, ok, route } from "lib/api";
import { requireUserApi } from "lib/auth/guards";
import { getOwnedOrder, toCustomerOrder } from "lib/orders/service";

/** [id] is the order number. Returns 404 for orders owned by someone else. */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUserApi();
  const { id } = await params;
  const order = await getOwnedOrder(user.id, id.toUpperCase());
  if (!order) return fail(404, "ORDER_NOT_FOUND", "Order not found.");
  return ok(toCustomerOrder(order));
});
