import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "db/client";
import { orders, paymentEmails, payments } from "db/schema";
import { isUniqueViolation } from "lib/api";
import { audit } from "lib/audit";
import { addHistory, confirmPayment, lockOrder, setPaymentStatus } from "lib/payments/transitions";
import { getSetting } from "lib/settings";
import { parsePaymentEmail } from "../parsers";
import type { NormalizedEmail, ParsedPayment } from "../types";
import { decideMatch, type CandidateOrder, type MatchDecision } from "./decide";
import { isTrustedSender } from "./trust";

export type ProcessResult = { outcome: "skipped" | "recorded"; status?: string; orderId?: string | null; reason?: string };

const candidateCols = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  totalPaise: orders.totalPaise,
  paymentStatus: orders.paymentStatus,
  fulfillmentStatus: orders.fulfillmentStatus,
  createdAt: orders.createdAt,
  paymentExpiresAt: orders.paymentExpiresAt,
};

async function recordEmail(email: NormalizedEmail, parsed: ParsedPayment | null, status: typeof paymentEmails.$inferInsert.status, extra: { orderId?: string | null; reason: string; candidateIds?: string[] }) {
  await db
    .insert(paymentEmails)
    .values({
      messageId: email.messageId,
      mailbox: email.mailbox,
      imapUid: email.imapUid,
      fromAddress: email.from.slice(0, 320),
      subject: email.subject.slice(0, 1000),
      receivedAt: email.receivedAt,
      parserName: parsed?.parser ?? null,
      amountPaise: parsed?.amountPaise ?? null,
      transactionRef: parsed?.transactionRef ?? null,
      transactionAt: parsed?.transactionAt ?? null,
      payerHandle: parsed?.payerHandle ?? null,
      note: parsed?.note ?? null,
      referencedOrderNumber: parsed?.referencedOrderNumber ?? null,
      bodyExcerpt: email.text.slice(0, 4000),
      status,
      matchedOrderId: extra.orderId ?? null,
      matchReason: extra.reason,
      candidateOrderIds: extra.candidateIds ?? [],
    })
    .onConflictDoNothing({ target: paymentEmails.messageId });
}

/**
 * Processes one email end-to-end. Idempotent: the Message-ID unique index means re-processing the same
 * email is a no-op, and the payments.transaction_ref unique index means one UTR can pay only one order.
 */
export async function processPaymentEmail(email: NormalizedEmail): Promise<ProcessResult> {
  const seen = await db.query.paymentEmails.findFirst({ where: eq(paymentEmails.messageId, email.messageId), columns: { id: true } });
  if (seen) return { outcome: "skipped", reason: "already processed" };

  const [imap, paymentCfg] = await Promise.all([getSetting("imap"), getSetting("payment")]);
  const trustedList = Array.from(
    new Set([
      ...imap.trustedSenders,
      ...(process.env.IMAP_TRUSTED_SENDERS
        ? process.env.IMAP_TRUSTED_SENDERS.split(",").map((s) => s.trim()).filter(Boolean)
        : ["noreply@slice.bank.in"]),
    ])
  );
  const trust = isTrustedSender(email, trustedList);
  if (!trust.trusted) {
    await recordEmail(email, null, "UNTRUSTED", { reason: trust.reason });
    return { outcome: "recorded", status: "UNTRUSTED", reason: trust.reason };
  }

  const parsed = parsePaymentEmail(email);
  if (!parsed || parsed.direction !== "CREDIT" || parsed.amountPaise === null) {
    const reason = !parsed ? "Not recognised as a UPI credit notification" : "Could not extract a credited amount";
    await recordEmail(email, parsed, "PARSE_FAILED", { reason });
    return { outcome: "recorded", status: "PARSE_FAILED", reason };
  }

  let refUsed = false;
  if (parsed.transactionRef) {
    const used = await db.query.payments.findFirst({ where: eq(payments.transactionRef, parsed.transactionRef), columns: { id: true } });
    const usedByEmail = await db.query.paymentEmails.findFirst({
      where: and(eq(paymentEmails.transactionRef, parsed.transactionRef), inArray(paymentEmails.status, ["MATCHED"])),
      columns: { id: true },
    });
    refUsed = Boolean(used || usedByEmail);
  }

  let referencedOrder: CandidateOrder | null = null;
  if (parsed.referencedOrderNumber) {
    const [o] = await db.select(candidateCols).from(orders).where(eq(orders.orderNumber, parsed.referencedOrderNumber)).limit(1);
    referencedOrder = o ?? null;
  }
  const amountCandidates = parsed.referencedOrderNumber
    ? []
    : await db
        .select(candidateCols)
        .from(orders)
        .where(and(eq(orders.totalPaise, parsed.amountPaise), or(eq(orders.paymentStatus, "PENDING"), eq(orders.paymentStatus, "VERIFYING"))))
        .limit(20);

  const decision: MatchDecision = decideMatch({
    parsed,
    receivedAt: email.receivedAt,
    referencedOrder,
    amountCandidates,
    transactionRefAlreadyUsed: refUsed,
    toleranceMinutes: paymentCfg.paymentTimeToleranceMinutes,
    autoConfirmHighConfidence: paymentCfg.autoConfirmHighConfidence,
  });

  if (decision.status !== "MATCHED") {
    await recordEmail(email, parsed, decision.status, { reason: decision.reason, candidateIds: decision.candidateIds });
    return { outcome: "recorded", status: decision.status, reason: decision.reason };
  }

  try {
    await db.transaction(async (tx) => {
      const order = await lockOrder(tx, decision.orderId);
      // Re-check under the row lock: an admin may have changed the order since we read it.
      if (!["PENDING", "VERIFYING", "EXPIRED"].includes(order.paymentStatus) || order.totalPaise !== parsed.amountPaise) {
        throw new Error("STATE_CHANGED");
      }
      const meta = { source: "imap", messageId: email.messageId, parser: parsed.parser, confidence: decision.confidence };
      if (decision.action === "PAID") {
        await confirmPayment(tx, order, {
          method: "UPI_EMAIL",
          transactionRef: parsed.transactionRef,
          transactionAt: parsed.transactionAt ?? email.receivedAt,
          actor: { type: "WORKER" },
          note: `Auto-verified from bank email (${decision.confidence} confidence)`,
          metadata: meta,
        });
      } else {
        await tx
          .update(payments)
          .set({ method: "UPI_EMAIL", transactionRef: parsed.transactionRef, transactionAt: parsed.transactionAt ?? email.receivedAt })
          .where(eq(payments.orderId, order.id));
        await setPaymentStatus(tx, order, "MATCHED", { type: "WORKER" }, `Bank email matched (${decision.confidence} confidence). Awaiting admin confirmation.`, meta);
      }
      await tx.insert(paymentEmails).values({
        messageId: email.messageId,
        mailbox: email.mailbox,
        imapUid: email.imapUid,
        fromAddress: email.from.slice(0, 320),
        subject: email.subject.slice(0, 1000),
        receivedAt: email.receivedAt,
        parserName: parsed.parser,
        amountPaise: parsed.amountPaise,
        transactionRef: parsed.transactionRef,
        transactionAt: parsed.transactionAt,
        payerHandle: parsed.payerHandle,
        note: parsed.note,
        referencedOrderNumber: parsed.referencedOrderNumber,
        bodyExcerpt: email.text.slice(0, 4000),
        status: "MATCHED",
        matchedOrderId: order.id,
        matchReason: decision.reason,
        candidateOrderIds: decision.candidateIds,
      });
      await addHistory(tx, order.id, {
        kind: "EVENT",
        note: `Payment email matched: ${parsed.transactionRef ?? "no ref"} via ${parsed.parser}`,
        actor: { type: "WORKER" },
      });
      await audit({ actorType: "WORKER", action: decision.action === "PAID" ? "payment.auto_confirm" : "payment.email_match", entityType: "order", entityId: order.id, metadata: meta }, tx);
    });
    return { outcome: "recorded", status: "MATCHED", orderId: decision.orderId, reason: decision.reason };
  } catch (err) {
    if (isUniqueViolation(err, "payment_emails_message_id_uq")) return { outcome: "skipped", reason: "already processed (race)" };
    if (isUniqueViolation(err, "payments_transaction_ref_uq")) {
      await recordEmail(email, parsed, "DUPLICATE", { reason: "Transaction reference already recorded on another payment" });
      return { outcome: "recorded", status: "DUPLICATE" };
    }
    if ((err as Error).message === "STATE_CHANGED") {
      await recordEmail(email, parsed, "UNMATCHED", { reason: "Order changed state during matching; left for manual review", candidateIds: decision.candidateIds });
      return { outcome: "recorded", status: "UNMATCHED" };
    }
    throw err;
  }
}
