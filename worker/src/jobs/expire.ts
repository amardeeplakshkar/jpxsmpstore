import { and, eq, lt } from "drizzle-orm";
import { db } from "db/client";
import { orders } from "db/schema";
import { lockOrder, setPaymentStatus } from "lib/payments/transitions";

/** Expires unpaid PENDING orders past their payment window. VERIFYING orders (screenshot submitted) wait for an admin. */
export async function expireOrders(): Promise<number> {
  const due = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.paymentStatus, "PENDING"), lt(orders.paymentExpiresAt, new Date())))
    .limit(500);
  let n = 0;
  for (const { id } of due) {
    await db.transaction(async (tx) => {
      const o = await lockOrder(tx, id);
      if (o.paymentStatus !== "PENDING" || o.paymentExpiresAt > new Date()) return;
      await setPaymentStatus(tx, o, "EXPIRED", { type: "WORKER" }, "Payment window elapsed");
      n++;
    });
  }
  return n;
}
