import { and, eq, gt, inArray, count } from "drizzle-orm";
import { db } from "db/client";
import { orderItems, orders, payments } from "db/schema";
import { ApiError, isUniqueViolation } from "lib/api";
import type { SessionUser } from "lib/auth/session";
import { generateOrderNumber } from "lib/orders/number";
import { buildUpiUri } from "lib/payments/upi";
import { addHistory } from "lib/payments/transitions";
import { getSetting } from "lib/settings";
import { quoteCart } from "lib/orders/quote";
import type { CheckoutInput } from "lib/validation/common";

const MAX_OPEN_ORDERS = 5;

/**
 * Creates an order from a checkout request. Prices come only from the database; the client only
 * sends product slugs and quantities. The (user_id, idempotency_key) unique index makes retries return the same order.
 */
export async function createOrder(user: SessionUser, input: CheckoutInput) {
  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.userId, user.id), eq(orders.idempotencyKey, input.idempotencyKey)),
  });
  if (existing) return { order: existing, created: false };

  const requested = input.items?.length ? input.items : [{ slug: input.productSlug as string, qty: 1 }];
  const quote = await quoteCart(requested);
  if (quote.unavailable.length) {
    throw new ApiError(409, "PRODUCT_UNAVAILABLE", `No longer available: ${quote.unavailable.join(", ")}. Remove it from your cart and try again.`);
  }
  if (quote.lines.length === 0) throw new ApiError(422, "CART_EMPTY", "Your cart is empty.");
  const wrongEdition = quote.lines.filter((l) => (input.gameEdition === "JAVA" ? !l.javaAvailable : !l.bedrockAvailable));
  if (wrongEdition.length) {
    throw new ApiError(
      422,
      "EDITION_UNAVAILABLE",
      `Not available for ${input.gameEdition === "JAVA" ? "Java" : "Bedrock"} Edition: ${wrongEdition.map((l) => l.name).join(", ")}.`,
    );
  }
  if (quote.totalPaise < 100) throw new ApiError(422, "AMOUNT_TOO_LOW", "Order total must be at least ₹1.");

  const payment = await getSetting("payment");
  if (!payment.upiId || !payment.qrEnabled) {
    throw new ApiError(503, "PAYMENTS_DISABLED", "Payments are temporarily unavailable. Please try again later.");
  }

  const [{ open }] = await db
    .select({ open: count() })
    .from(orders)
    .where(
      and(eq(orders.userId, user.id), inArray(orders.paymentStatus, ["PENDING", "VERIFYING"]), gt(orders.paymentExpiresAt, new Date())),
    );
  if (open >= MAX_OPEN_ORDERS) {
    throw new ApiError(429, "TOO_MANY_OPEN_ORDERS", "You have too many unpaid orders. Complete or wait for them to expire first.");
  }

  const expiresAt = new Date(Date.now() + payment.expiryMinutes * 60_000);

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateOrderNumber();
    try {
      const order = await db.transaction(async (tx) => {
        const [o] = await tx
          .insert(orders)
          .values({
            orderNumber,
            userId: user.id,
            purchaseType: input.purchaseType,
            minecraftUsername: input.minecraftUsername,
            gameEdition: input.gameEdition,
            giftNote: input.purchaseType === "GIFT" ? (input.giftNote ?? null) : null,
            subtotalPaise: quote.subtotalPaise,
            discountPaise: quote.discountPaise,
            totalPaise: quote.totalPaise,
            idempotencyKey: input.idempotencyKey,
            paymentExpiresAt: expiresAt,
          })
          .returning();
        await tx.insert(orderItems).values(
          quote.lines.map((l) => {
            const p = quote.raw.get(l.slug)!;
            return {
              orderId: o.id,
              productId: l.productId,
              productSnapshot: {
                productId: l.productId,
                name: l.name,
                slug: l.slug,
                type: l.type,
                imageUrl: l.imageUrl,
                categoryName: l.categoryName,
                gameModeName: l.gameModeName,
                shortDescription: p.shortDescription,
                metadata: p.metadata,
              },
              quantity: l.qty,
              regularPricePaise: l.regularPaise,
              unitPricePaise: l.unitPaise,
              discountPaise: l.lineRegularPaise - l.lineTotalPaise,
              lineTotalPaise: l.lineTotalPaise,
            };
          }),
        );
        await tx.insert(payments).values({
          orderId: o.id,
          amountPaise: quote.totalPaise,
          upiId: payment.upiId,
          payeeName: payment.payeeName,
          upiUri: buildUpiUri({ upiId: payment.upiId, payeeName: payment.payeeName, amountPaise: quote.totalPaise, orderNumber }),
          expiresAt,
        });
        await addHistory(tx, o.id, {
          kind: "EVENT",
          to: "PENDING",
          note: `Order created (${input.purchaseType === "GIFT" ? "gift" : "self"}, ${input.gameEdition}, ${quote.lines.map((l) => `${l.qty}x ${l.name}`).join(", ")})`,
          actor: { type: "USER", userId: user.id },
        });
        return o;
      });
      return { order, created: true };
    } catch (err) {
      if (isUniqueViolation(err, "orders_user_idempotency_uq")) {
        const again = await db.query.orders.findFirst({
          where: and(eq(orders.userId, user.id), eq(orders.idempotencyKey, input.idempotencyKey)),
        });
        if (again) return { order: again, created: false };
      }
      if (isUniqueViolation(err, "orders_order_number_uq")) continue; // extremely rare collision: retry
      throw err;
    }
  }
  throw new ApiError(500, "ORDER_NUMBER_EXHAUSTED", "Could not allocate an order number. Please retry.");
}

/** Loads an order only if it belongs to the user. Returns null otherwise (callers respond 404, never 403, to avoid leaking existence). */
export async function getOwnedOrder(userId: string, orderNumber: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)),
    with: {
      items: true,
      payment: true,
      fulfillment: true,
      screenshots: { orderBy: (s, { desc }) => [desc(s.createdAt)] },
      history: { orderBy: (h, { asc }) => [asc(h.createdAt)] },
    },
  });
  return order ?? null;
}
export type OwnedOrder = NonNullable<Awaited<ReturnType<typeof getOwnedOrder>>>;

/** Client-safe order view. Excludes internal notes, admin identities and storage keys. */
export function toCustomerOrder(o: OwnedOrder) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    purchaseType: o.purchaseType,
    minecraftUsername: o.minecraftUsername,
    gameEdition: o.gameEdition,
    giftNote: o.giftNote,
    subtotalPaise: o.subtotalPaise,
    discountPaise: o.discountPaise,
    totalPaise: o.totalPaise,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    paymentExpiresAt: o.paymentExpiresAt,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    evidenceRequestNote: o.evidenceRequestedAt ? o.evidenceRequestNote : null,
    items: o.items.map((i) => ({
      name: i.productSnapshot.name,
      slug: i.productSnapshot.slug,
      type: i.productSnapshot.type,
      gameModeName: i.productSnapshot.gameModeName ?? null,
      imageUrl: i.productSnapshot.imageUrl,
      unitPricePaise: i.unitPricePaise,
      regularPricePaise: i.regularPricePaise,
      quantity: i.quantity,
    })),
    screenshots: o.screenshots.map((s) => ({
      id: s.id,
      status: s.status,
      rejectionReason: s.rejectionReason,
      transactionRef: s.transactionRef,
      createdAt: s.createdAt,
    })),
    timeline: o.history
      .filter((h) => h.kind !== "NOTE")
      .map((h) => ({ kind: h.kind, to: h.toStatus, createdAt: h.createdAt })),
  };
}
