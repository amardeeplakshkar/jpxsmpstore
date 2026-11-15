import type { ParsedPayment } from "../types";

export type CandidateOrder = {
  id: string;
  orderNumber: string;
  totalPaise: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: Date;
  paymentExpiresAt: Date;
};

export type MatchDecision =
  | { status: "MATCHED"; orderId: string; confidence: "HIGH" | "MEDIUM"; action: "PAID" | "MATCHED"; reason: string; candidateIds: string[] }
  | { status: "UNMATCHED" | "AMBIGUOUS" | "DUPLICATE"; reason: string; candidateIds: string[] };

const OPEN = ["PENDING", "VERIFYING", "EXPIRED"];

/**
 * Pure matching decision. Never matches on anything other than an exact paise amount.
 * HIGH confidence = the payment note references the order number and everything else lines up.
 * MEDIUM confidence = exactly one open order has this amount within the time window (needs admin confirmation).
 */
export function decideMatch(input: {
  parsed: ParsedPayment;
  receivedAt: Date;
  referencedOrder: CandidateOrder | null;
  amountCandidates: CandidateOrder[];
  transactionRefAlreadyUsed: boolean;
  toleranceMinutes: number;
  autoConfirmHighConfidence: boolean;
}): MatchDecision {
  const { parsed } = input;
  if (input.transactionRefAlreadyUsed) {
    return { status: "DUPLICATE", reason: `Transaction reference ${parsed.transactionRef} was already used`, candidateIds: [] };
  }
  const amount = parsed.amountPaise;
  if (amount === null) return { status: "UNMATCHED", reason: "No amount found", candidateIds: [] };
  const txAt = parsed.transactionAt ?? input.receivedAt;
  const tol = input.toleranceMinutes * 60_000;
  const inWindow = (o: CandidateOrder) =>
    txAt.getTime() >= o.createdAt.getTime() - tol && txAt.getTime() <= o.paymentExpiresAt.getTime() + tol;

  if (parsed.referencedOrderNumber) {
    const o = input.referencedOrder;
    if (!o) return { status: "UNMATCHED", reason: `Referenced order ${parsed.referencedOrderNumber} does not exist`, candidateIds: [] };
    if (o.fulfillmentStatus === "CANCELLED") return { status: "UNMATCHED", reason: `Order ${o.orderNumber} is cancelled`, candidateIds: [o.id] };
    if (!OPEN.includes(o.paymentStatus)) {
      return { status: "UNMATCHED", reason: `Order ${o.orderNumber} payment is already ${o.paymentStatus}`, candidateIds: [o.id] };
    }
    if (o.totalPaise !== amount) {
      return { status: "UNMATCHED", reason: `Amount ${amount} paise does not equal order total ${o.totalPaise} paise`, candidateIds: [o.id] };
    }
    if (!inWindow(o)) return { status: "UNMATCHED", reason: "Payment time is outside the order's payment window", candidateIds: [o.id] };
    if (!parsed.transactionRef) {
      return { status: "MATCHED", orderId: o.id, confidence: "MEDIUM", action: "MATCHED", reason: "Order number and amount match, but no transaction reference was found", candidateIds: [o.id] };
    }
    return {
      status: "MATCHED",
      orderId: o.id,
      confidence: "HIGH",
      action: input.autoConfirmHighConfidence ? "PAID" : "MATCHED",
      reason: "Order number, exact amount, transaction reference and time window all match",
      candidateIds: [o.id],
    };
  }

  const candidates = input.amountCandidates.filter(
    (o) => o.totalPaise === amount && ["PENDING", "VERIFYING"].includes(o.paymentStatus) && o.fulfillmentStatus !== "CANCELLED" && inWindow(o),
  );
  const ids = candidates.map((c) => c.id);
  if (candidates.length === 0) return { status: "UNMATCHED", reason: "No open order with this exact amount in the time window", candidateIds: [] };
  if (candidates.length > 1) return { status: "AMBIGUOUS", reason: `${candidates.length} open orders share this amount`, candidateIds: ids };
  if (!parsed.transactionRef) {
    return { status: "UNMATCHED", reason: "Amount matches one order but no transaction reference was found", candidateIds: ids };
  }
  return {
    status: "MATCHED",
    orderId: candidates[0].id,
    confidence: "MEDIUM",
    action: "MATCHED",
    reason: "Exact amount matches a single open order (no order number in note). Admin confirmation required.",
    candidateIds: ids,
  };
}
