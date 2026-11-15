import { and, eq, gt, inArray, isNull, count } from "drizzle-orm";
import { db } from "db/client";
import { orderItems, orders, payments, products } from "db/schema";
import { ApiError, isUniqueViolation } from "lib/api";
import type { SessionUser } from "lib/auth/session";
import { generateOrderNumber } from "lib/orders/number";
import { buildUpiUri } from "lib/payments/upi";
import { addHistory } from "lib/payments/transitions";
import { getSetting } from "lib/settings";
import { effectivePricePaise } from "lib/utils";
import type { CheckoutInput } from "lib/validation/common";

const MAX_OPEN_ORDERS = 5;

/**
 * Creates an order from a checkout request. Prices come only from the database; the client only
 * sends the product slug. The (user_id, idempotency_key) unique index makes retries return the same order.
 */
export async function createOrder(user: SessionUser, input: CheckoutInput) {
  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.userId, user.id), eq(orders.idempotencyKey, input.idempotencyKey)),
  });
  if (existing) return { order: existing, created: false };

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, input.productSlug), eq(products.isActive, true), isNull(products.deletedAt)),
    with: { category: true },
  });
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "This product is no longer available.");
  if (input.gameEdition === "JAVA" && !product.javaAvailable) {
    throw new ApiError(422, "EDITION_UNAVAILABLE", "This product is not available for Java Edition.");
  }
  if (input.gameEdition === "BEDROCK" && !product.bedrockAvailable) {
    throw new ApiError(422, "EDITION_UNAVAILABLE", "This product is not available for Bedrock Edition.");
  }

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

  const unit = effectivePricePaise(product);
  const discount = product.regularPricePaise - unit;
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
            subtotalPaise: product.regularPricePaise,
            discountPaise: discount,
            totalPaise: unit,
            idempotencyKey: input.idempotencyKey,
            paymentExpiresAt: expiresAt,
          })
          .returning();
        await tx.insert(orderItems).values({
          orderId: o.id,
          productId: product.id,
          productSnapshot: {
            productId: product.id,
            name: product.name,
            slug: product.slug,
            type: product.type,
            imageUrl: product.imageUrl,
            categoryName: product.category?.name ?? null,
            shortDescription: product.shortDescription,
            metadata: product.metadata,
          },
          quantity: 1,
          regularPricePaise: product.regularPricePaise,
          unitPricePaise: unit,
          discountPaise: discount,
          lineTotalPaise: unit,
        });
        await tx.insert(payments).values({
          orderId: o.id,
          amountPaise: unit,
          upiId: payment.upiId,
          payeeName: payment.payeeName,
          upiUri: buildUpiUri({ upiId: payment.upiId, payeeName: payment.payeeName, amountPaise: unit, orderNumber }),
          expiresAt,
        });
        await addHistory(tx, o.id, {
          kind: "EVENT",
          to: "PENDING",
          note: `Order created (${input.purchaseType === "GIFT" ? "gift" : "self"}, ${input.gameEdition})`,
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
