import { after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "db/client";
import { orders } from "db/schema";
import { clientIp, ok, parseJson, route } from "lib/api";
import { requireUserApi } from "lib/auth/guards";
import { createOrder } from "lib/orders/service";
import { notifyOrder } from "lib/notify/discord";
import { rateLimit } from "lib/rate-limit";
import { checkoutSchema } from "lib/validation/common";

/** Lists the current user's orders only. */
export const GET = route(async () => {
  const user = await requireUserApi();
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    orderBy: [desc(orders.createdAt)],
    limit: 100,
    with: { items: true },
  });
  return ok(
    rows.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      totalPaise: o.totalPaise,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      purchaseType: o.purchaseType,
      minecraftUsername: o.minecraftUsername,
      gameEdition: o.gameEdition,
      products: o.items.map((i) => i.productSnapshot.name),
    })),
  );
});

/** Creates an order. The client never sends prices. Idempotent per (user, idempotencyKey). */
export const POST = route(async (req) => {
  const user = await requireUserApi();
  await rateLimit("order-create", `${user.id}:${clientIp(req)}`, 10, 60);
  const input = await parseJson(req, checkoutSchema);
  const { order, created } = await createOrder(user, input);
  if (created) after(() => notifyOrder(order.id, "created"));
  return ok({ orderNumber: order.orderNumber, created }, created ? 201 : 200);
});
