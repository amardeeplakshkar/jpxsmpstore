import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { orders, paymentEmails } from "db/schema";
import { ApiError, isUniqueViolation, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { confirmPayment, lockOrder } from "lib/payments/transitions";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), orderNumber: z.string().trim().min(5).max(32) }),
  z.object({ action: z.literal("ignore"), reason: z.string().trim().min(3).max(300) }),
]);

/** Manual review of an IMAP payment email: link it to an order (confirms payment) or ignore it. */
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdminApi("payments.verify");
  const { id } = await params;
  const input = await parseJson(req, schema);
  try {
    const result = await db.transaction(async (tx) => {
      const [email] = await tx.select().from(paymentEmails).where(eq(paymentEmails.id, id)).for("update");
      if (!email) throw new ApiError(404, "NOT_FOUND", "Payment email not found.");
      if (email.status === "MATCHED" && email.matchedOrderId) throw new ApiError(409, "ALREADY_MATCHED", "This email is already linked to an order.");
      if (input.action === "ignore") {
        await tx.update(paymentEmails).set({ status: "IGNORED", matchReason: `Ignored: ${input.reason}`, reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(paymentEmails.id, id));
        await audit({ actor: admin, action: "payment_email.ignore", entityType: "payment_email", entityId: id, metadata: { reason: input.reason }, req }, tx);
        return { status: "IGNORED" };
      }
      if (email.status === "UNTRUSTED") throw new ApiError(409, "UNTRUSTED", "Emails from untrusted senders cannot be used as payment evidence.");
      if (email.amountPaise === null) throw new ApiError(409, "NO_AMOUNT", "This email has no parsed amount.");
      const target = await tx.query.orders.findFirst({ where: and(eq(orders.orderNumber, input.orderNumber.toUpperCase())) });
      if (!target) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      const order = await lockOrder(tx, target.id);
      if (order.totalPaise !== email.amountPaise) throw new ApiError(409, "AMOUNT_MISMATCH", "Email amount does not exactly match the order total.");
      if (order.paymentStatus === "PAID") throw new ApiError(409, "ALREADY_PAID", "Order is already paid.");
      await confirmPayment(tx, order, {
        method: "UPI_EMAIL",
        transactionRef: email.transactionRef,
        transactionAt: email.transactionAt ?? email.receivedAt,
        actor: { type: "ADMIN", userId: admin.id },
        note: "Payment email linked manually by admin",
        metadata: { paymentEmailId: email.id },
      });
      await tx
        .update(paymentEmails)
        .set({ status: "MATCHED", matchedOrderId: order.id, matchReason: `Linked manually by ${admin.username}`, reviewedBy: admin.id, reviewedAt: new Date() })
        .where(eq(paymentEmails.id, id));
      await audit({ actor: admin, action: "payment_email.link", entityType: "order", entityId: order.id, metadata: { paymentEmailId: id }, req }, tx);
      return { status: "MATCHED", orderId: order.id };
    });
    return ok(result);
  } catch (err) {
    if (isUniqueViolation(err, "payments_transaction_ref_uq")) throw new ApiError(409, "DUPLICATE_TRANSACTION", "This transaction reference is already used by another payment.");
    throw err;
  }
});
