import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { fulfillments, orders, payments, paymentScreenshots } from "db/schema";
import { ApiError, isUniqueViolation } from "lib/api";
import { audit } from "lib/audit";
import type { AdminSession } from "lib/auth/guards";
import { addHistory, confirmPayment, ensureFulfillmentRecord, lockOrder, setFulfillmentStatus, setPaymentStatus } from "lib/payments/transitions";
import { hasPermission, type Permission } from "lib/permissions";

const ref = z.string().trim().regex(/^[A-Za-z0-9]{8,35}$/, "Transaction reference should be 8-35 letters or numbers").optional().nullable();

export const orderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm_payment"), transactionRef: ref, note: z.string().max(500).optional() }),
  z.object({ action: z.literal("reject_payment"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("request_evidence"), message: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("start_fulfillment"), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("mark_fulfilled"), deliveryNotes: z.string().max(2000).optional(), proofUrl: z.string().url().max(1000).optional().or(z.literal("")) }),
  z.object({ action: z.literal("mark_failed"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("refund"), note: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("add_note"), note: z.string().trim().min(1).max(2000) }),
]);
export type OrderAction = z.infer<typeof orderActionSchema>;

const ACTION_PERMISSION: Record<OrderAction["action"], Permission> = {
  confirm_payment: "payments.verify",
  reject_payment: "payments.verify",
  request_evidence: "payments.verify",
  start_fulfillment: "fulfillment.manage",
  mark_fulfilled: "fulfillment.manage",
  mark_failed: "fulfillment.manage",
  cancel: "orders.cancel",
  refund: "payments.refund",
  add_note: "orders.note",
};

/** Executes an admin order action inside one transaction with a row lock, status-transition checks and audit logging. */
export async function runOrderAction(admin: AdminSession, orderId: string, input: OrderAction, req: Request) {
  if (!hasPermission(admin.adminRole, ACTION_PERMISSION[input.action])) {
    throw new ApiError(403, "FORBIDDEN", "Your admin role does not allow this action.");
  }
  const actor = { type: "ADMIN" as const, userId: admin.id };
  try {
    return await db.transaction(async (tx) => {
      let order = await lockOrder(tx, orderId);
      switch (input.action) {
        case "confirm_payment": {
          if (order.paymentStatus === "PAID") throw new ApiError(409, "ALREADY_PAID", "Payment is already confirmed.");
          const payment = await tx.query.payments.findFirst({ where: eq(payments.orderId, order.id) });
          order = await confirmPayment(tx, order, {
            method: payment?.method ?? "MANUAL",
            transactionRef: input.transactionRef || payment?.transactionRef || null,
            transactionAt: payment?.transactionAt ?? null,
            actor,
            note: input.note || "Payment confirmed by admin",
          });
          break;
        }
        case "reject_payment":
          await tx.update(payments).set({ rejectionReason: input.reason }).where(eq(payments.orderId, order.id));
          order = await setPaymentStatus(tx, order, "REJECTED", actor, input.reason);
          break;
        case "request_evidence":
          await tx.update(orders).set({ evidenceRequestedAt: new Date(), evidenceRequestNote: input.message }).where(eq(orders.id, order.id));
          await addHistory(tx, order.id, { kind: "EVENT", note: `Evidence requested: ${input.message}`, actor });
          if (["REJECTED", "EXPIRED"].includes(order.paymentStatus)) order = await setPaymentStatus(tx, order, "VERIFYING", actor, "Awaiting additional evidence");
          break;
        case "start_fulfillment":
          if (order.paymentStatus !== "PAID") throw new ApiError(409, "NOT_PAID", "Only paid orders can be fulfilled.");
          await ensureFulfillmentRecord(tx, order);
          await tx.update(fulfillments).set({ startedBy: admin.id, startedAt: new Date() }).where(eq(fulfillments.orderId, order.id));
          order = await setFulfillmentStatus(tx, order, "PROCESSING", actor, input.note);
          break;
        case "mark_fulfilled":
          if (order.paymentStatus !== "PAID") throw new ApiError(409, "NOT_PAID", "Only paid orders can be fulfilled.");
          await ensureFulfillmentRecord(tx, order);
          await tx
            .update(fulfillments)
            .set({
              fulfilledBy: admin.id,
              fulfilledByDiscordId: admin.discordId,
              fulfilledAt: new Date(),
              deliveryNotes: input.deliveryNotes || null,
              proofUrl: input.proofUrl || null,
              failureReason: null,
            })
            .where(eq(fulfillments.orderId, order.id));
          order = await setFulfillmentStatus(tx, order, "FULFILLED", actor, input.deliveryNotes || "Delivered in-game");
          break;
        case "mark_failed":
          await ensureFulfillmentRecord(tx, order);
          await tx.update(fulfillments).set({ failureReason: input.reason }).where(eq(fulfillments.orderId, order.id));
          order = await setFulfillmentStatus(tx, order, "FAILED", actor, input.reason);
          break;
        case "cancel":
          if (order.fulfillmentStatus === "FULFILLED") throw new ApiError(409, "ALREADY_FULFILLED", "Fulfilled orders cannot be cancelled. Use refund instead.");
          order = await setFulfillmentStatus(tx, order, "CANCELLED", actor, input.reason);
          if (["PENDING", "VERIFYING", "MATCHED"].includes(order.paymentStatus)) {
            order = await setPaymentStatus(tx, order, "REJECTED", actor, `Order cancelled: ${input.reason}`);
          }
          break;
        case "refund":
          order = await setPaymentStatus(tx, order, "REFUNDED", actor, input.note);
          if (!["FULFILLED", "CANCELLED"].includes(order.fulfillmentStatus)) order = await setFulfillmentStatus(tx, order, "CANCELLED", actor, "Refunded");
          break;
        case "add_note":
          await addHistory(tx, order.id, { kind: "NOTE", note: input.note, actor });
          break;
      }
      await audit({ actor: admin, action: `order.${input.action}`, entityType: "order", entityId: order.id, metadata: { orderNumber: order.orderNumber, ...input }, req }, tx);
      return order;
    });
  } catch (err) {
    if (isUniqueViolation(err, "payments_transaction_ref_uq")) {
      throw new ApiError(409, "DUPLICATE_TRANSACTION", "This transaction reference is already used by another payment.");
    }
    throw err;
  }
}

/** Approve or reject a screenshot. Approval confirms the payment; this is the only way a screenshot leads to PAID. */
export async function reviewScreenshot(admin: AdminSession, screenshotId: string, input: { decision: "APPROVE"; transactionRef?: string | null } | { decision: "REJECT"; reason: string }, req: Request) {
  try {
    return await db.transaction(async (tx) => {
      const shot = await tx.query.paymentScreenshots.findFirst({ where: eq(paymentScreenshots.id, screenshotId) });
      if (!shot) throw new ApiError(404, "NOT_FOUND", "Screenshot not found.");
      if (shot.status !== "PENDING") throw new ApiError(409, "ALREADY_REVIEWED", "This screenshot was already reviewed.");
      let order = await lockOrder(tx, shot.orderId);
      const actor = { type: "ADMIN" as const, userId: admin.id };
      if (input.decision === "APPROVE") {
        await tx.update(paymentScreenshots).set({ status: "APPROVED", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(paymentScreenshots.id, shot.id));
        if (order.paymentStatus !== "PAID") {
          order = await confirmPayment(tx, order, {
            method: "UPI_SCREENSHOT",
            transactionRef: input.transactionRef || shot.transactionRef,
            actor,
            note: "Payment confirmed from screenshot",
            metadata: { screenshotId: shot.id },
          });
        }
      } else {
        await tx
          .update(paymentScreenshots)
          .set({ status: "REJECTED", rejectionReason: input.reason, reviewedBy: admin.id, reviewedAt: new Date() })
          .where(eq(paymentScreenshots.id, shot.id));
        const others = await tx.query.paymentScreenshots.findMany({ where: eq(paymentScreenshots.orderId, order.id) });
        const stillPending = others.some((o) => o.id !== shot.id && o.status === "PENDING");
        if (!stillPending && order.paymentStatus === "VERIFYING") {
          order = await setPaymentStatus(tx, order, "REJECTED", actor, `Screenshot rejected: ${input.reason}`);
        } else {
          await addHistory(tx, order.id, { kind: "EVENT", note: `Screenshot rejected: ${input.reason}`, actor });
        }
      }
      await audit({ actor: admin, action: `screenshot.${input.decision.toLowerCase()}`, entityType: "order", entityId: order.id, metadata: { screenshotId, ...input }, req }, tx);
      return order;
    });
  } catch (err) {
    if (isUniqueViolation(err, "payments_transaction_ref_uq")) {
      throw new ApiError(409, "DUPLICATE_TRANSACTION", "This transaction reference is already used by another payment.");
    }
    throw err;
  }
}
