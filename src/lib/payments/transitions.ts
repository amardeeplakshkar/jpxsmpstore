import { eq } from "drizzle-orm";
import type { Tx } from "db/client";
import {
  fulfillments,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  type FulfillmentStatus,
  type Order,
  type PaymentStatus,
} from "db/schema";
import { ApiError } from "lib/api";

type Actor = { type: "SYSTEM" | "USER" | "ADMIN" | "WORKER"; userId?: string | null };

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["VERIFYING", "MATCHED", "PAID", "REJECTED", "EXPIRED"],
  VERIFYING: ["PENDING", "MATCHED", "PAID", "REJECTED", "EXPIRED"],
  MATCHED: ["PAID", "REJECTED", "VERIFYING"],
  PAID: ["REFUNDED"],
  REJECTED: ["VERIFYING", "PAID"],
  EXPIRED: ["VERIFYING", "MATCHED", "PAID"],
  REFUNDED: [],
};

export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ["PROCESSING", "FULFILLED", "FAILED", "CANCELLED"],
  PROCESSING: ["FULFILLED", "FAILED", "CANCELLED", "PENDING"],
  FAILED: ["PROCESSING", "CANCELLED"],
  FULFILLED: [],
  CANCELLED: [],
};

/** Locks the order row for the remainder of the transaction (SELECT ... FOR UPDATE). */
export async function lockOrder(tx: Tx, orderId: string): Promise<Order> {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  return order;
}

export async function addHistory(
  tx: Tx,
  orderId: string,
  entry: { kind: "PAYMENT" | "FULFILLMENT" | "NOTE" | "EVENT"; from?: string | null; to?: string | null; note?: string | null; actor: Actor; metadata?: Record<string, unknown> },
) {
  await tx.insert(orderStatusHistory).values({
    orderId,
    kind: entry.kind,
    fromStatus: entry.from ?? null,
    toStatus: entry.to ?? null,
    note: entry.note ?? null,
    actorType: entry.actor.type,
    actorUserId: entry.actor.userId ?? null,
    metadata: entry.metadata ?? {},
  });
}

export async function setPaymentStatus(tx: Tx, order: Order, to: PaymentStatus, actor: Actor, note?: string | null, metadata?: Record<string, unknown>) {
  if (order.paymentStatus === to) return order;
  if (!PAYMENT_TRANSITIONS[order.paymentStatus].includes(to)) {
    throw new ApiError(409, "INVALID_TRANSITION", `Payment cannot move from ${order.paymentStatus} to ${to}.`);
  }
  const [updated] = await tx
    .update(orders)
    .set({ paymentStatus: to, paidAt: to === "PAID" ? new Date() : order.paidAt })
    .where(eq(orders.id, order.id))
    .returning();
  await addHistory(tx, order.id, { kind: "PAYMENT", from: order.paymentStatus, to, note, actor, metadata });
  return updated;
}

export async function setFulfillmentStatus(tx: Tx, order: Order, to: FulfillmentStatus, actor: Actor, note?: string | null) {
  if (order.fulfillmentStatus === to) return order;
  if (!FULFILLMENT_TRANSITIONS[order.fulfillmentStatus].includes(to)) {
    throw new ApiError(409, "INVALID_TRANSITION", `Fulfillment cannot move from ${order.fulfillmentStatus} to ${to}.`);
  }
  const [updated] = await tx
    .update(orders)
    .set({ fulfillmentStatus: to, cancelledAt: to === "CANCELLED" ? new Date() : order.cancelledAt })
    .where(eq(orders.id, order.id))
    .returning();
  await addHistory(tx, order.id, { kind: "FULFILLMENT", from: order.fulfillmentStatus, to, note, actor });
  return updated;
}

/**
 * Confirms a payment. Records evidence on the payment row (transaction reference is unique, so a
 * reused UTR fails with a unique violation and the whole transaction rolls back), marks the order
 * PAID and places it in the fulfillment queue.
 */
export async function confirmPayment(
  tx: Tx,
  order: Order,
  opts: {
    method: "UPI_EMAIL" | "UPI_SCREENSHOT" | "MANUAL";
    transactionRef?: string | null;
    transactionAt?: Date | null;
    actor: Actor;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (order.fulfillmentStatus === "CANCELLED") {
    throw new ApiError(409, "ORDER_CANCELLED", "This order was cancelled. Reopen is not supported; refund or create a new order.");
  }
  await tx
    .update(payments)
    .set({
      method: opts.method,
      transactionRef: opts.transactionRef ? opts.transactionRef.toUpperCase() : null,
      transactionAt: opts.transactionAt ?? null,
      verifiedAt: new Date(),
      verifiedBy: opts.actor.userId ?? null,
      rejectionReason: null,
    })
    .where(eq(payments.orderId, order.id));
  const updated = await setPaymentStatus(tx, order, "PAID", opts.actor, opts.note, {
    method: opts.method,
    transactionRef: opts.transactionRef ?? null,
    ...opts.metadata,
  });
  await ensureFulfillmentRecord(tx, updated);
  return updated;
}

export async function ensureFulfillmentRecord(tx: Tx, order: Order) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const delivered = items.map((i) => `${i.quantity}x ${i.productSnapshot.name}`).join(", ");
  await tx
    .insert(fulfillments)
    .values({
      orderId: order.id,
      minecraftUsername: order.minecraftUsername,
      gameEdition: order.gameEdition,
      productDelivered: delivered || "Unknown product",
    })
    .onConflictDoNothing({ target: fulfillments.orderId });
}
