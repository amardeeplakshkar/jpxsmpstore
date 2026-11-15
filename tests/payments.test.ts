import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePaymentEmail } from "../worker/src/parsers";
import { extractAmountPaise, extractTimestamp } from "../worker/src/parsers/extract";
import { decideMatch, type CandidateOrder } from "../worker/src/matching/decide";
import { isTrustedSender } from "../worker/src/matching/trust";
import { findOrderNumber, generateOrderNumber } from "lib/orders/number";
import { buildUpiUri } from "lib/payments/upi";
import { decimalStringToPaise, effectivePricePaise, paiseToDecimalString, safeReturnTo } from "lib/utils";
import { checkoutSchema } from "lib/validation/common";
import { productInputSchema } from "lib/validation/product";
import { hasPermission } from "lib/permissions";
import * as F from "./fixtures/emails";

const TRUSTED = ["@hdfcbank.net", "@icicibank.com", "@phonepe.com", "noreply@slice.bank.in"];

const order = (over: Partial<CandidateOrder> = {}): CandidateOrder => ({
  id: "o1",
  orderNumber: "JPX-20261114-A8K92",
  totalPaise: 19900,
  paymentStatus: "PENDING",
  fulfillmentStatus: "PENDING",
  createdAt: new Date("2026-11-14T04:50:00Z"),
  paymentExpiresAt: new Date("2026-11-14T05:20:00Z"),
  ...over,
});

const base = { receivedAt: new Date("2026-11-14T05:00:00Z"), toleranceMinutes: 15, autoConfirmHighConfidence: true, transactionRefAlreadyUsed: false };

describe("money", () => {
  it("converts between paise and decimal strings without floats", () => {
    assert.equal(paiseToDecimalString(19900), "199.00");
    assert.equal(paiseToDecimalString(5), "0.05");
    assert.equal(decimalStringToPaise("1,299.5"), 129950);
    assert.equal(decimalStringToPaise("0.1"), 10);
    assert.equal(decimalStringToPaise("abc"), null);
  });
  it("uses the sale price only when lower", () => {
    assert.equal(effectivePricePaise({ regularPricePaise: 19900, salePricePaise: 14900 }), 14900);
    assert.equal(effectivePricePaise({ regularPricePaise: 19900, salePricePaise: 29900 }), 19900);
  });
});

describe("order numbers and UPI", () => {
  it("generates JPX-YYYYMMDD-XXXXX in IST", () => {
    const n = generateOrderNumber(new Date("2026-11-13T20:00:00Z")); // 01:30 IST on the 14th
    assert.match(n, /^JPX-20261114-[2-9A-HJKMNP-Z]{5}$/);
  });
  it("finds order numbers even without hyphens", () => {
    assert.equal(findOrderNumber("UPI/123/JPX20261114A8K92/x"), "JPX-20261114-A8K92");
    assert.equal(findOrderNumber("nothing here"), null);
  });
  it("builds a UPI intent URI from the server amount", () => {
    const uri = buildUpiUri({ upiId: "merchant@upi", payeeName: "JPX MC", amountPaise: 19900, orderNumber: "JPX-20261114-A8K92" });
    assert.equal(uri, "upi://pay?pa=merchant%40upi&pn=JPX%20MC&am=199.00&cu=INR&tn=JPX-20261114-A8K92&tr=JPX-20261114-A8K92");
  });
});

describe("validation", () => {
  const ok = { productSlug: "vip", purchaseType: "SELF", gameEdition: "JAVA", minecraftUsername: "Steve_123", idempotencyKey: "a".repeat(32) };
  it("accepts Java and Bedrock usernames by edition", () => {
    assert.equal(checkoutSchema.safeParse(ok).success, true);
    assert.equal(checkoutSchema.safeParse({ ...ok, minecraftUsername: "Alex Gamer" }).success, false);
    assert.equal(checkoutSchema.safeParse({ ...ok, gameEdition: "BEDROCK", minecraftUsername: "Alex Gamer" }).success, true);
  });
  it("never accepts a client price field as meaningful (schema strips it)", () => {
    const r = checkoutSchema.parse({ ...ok, totalPaise: 1 } as never);
    assert.equal("totalPaise" in r, false);
  });
  it("validates product metadata per type", () => {
    const p = { name: "VIP", slug: "vip", regularPricePaise: 19900, type: "RANK", metadata: { perks: ["/fly"], durationDays: 30 } };
    assert.equal(productInputSchema.safeParse(p).success, true);
    assert.equal(productInputSchema.safeParse({ ...p, type: "COINS", metadata: {} }).success, false);
    assert.equal(productInputSchema.safeParse({ ...p, salePricePaise: 29900 }).success, false);
  });
  it("only allows same-site return paths", () => {
    assert.equal(safeReturnTo("/checkout/vip"), "/checkout/vip");
    assert.equal(safeReturnTo("//evil.com"), "/");
    assert.equal(safeReturnTo("https://evil.com"), "/");
  });
});

describe("permissions", () => {
  it("SUPPORT cannot verify payments or manage products", () => {
    assert.equal(hasPermission("SUPPORT", "payments.verify"), false);
    assert.equal(hasPermission("SUPPORT", "products.manage"), false);
    assert.equal(hasPermission("SUPPORT", "fulfillment.manage"), true);
    assert.equal(hasPermission(null, "dashboard.view"), false);
    assert.equal(hasPermission("ADMIN", "settings.payment"), false);
    assert.equal(hasPermission("SUPER_ADMIN", "settings.payment"), true);
  });
});

describe("email parsing", () => {
  it("parses an HDFC credit with order note", () => {
    const p = parsePaymentEmail(F.hdfcCreditWithOrder)!;
    assert.equal(p.parser, "hdfc");
    assert.equal(p.amountPaise, 19900);
    assert.equal(p.transactionRef, "431812345678");
    assert.equal(p.referencedOrderNumber, "JPX-20261114-A8K92");
    assert.equal(p.payerHandle, "steve@okicici");
  });
  it("parses ICICI Info: UPI/ref/note/vpa format", () => {
    const p = parsePaymentEmail(F.iciciCreditNoHyphens)!;
    assert.equal(p.amountPaise, 19900);
    assert.equal(p.transactionRef, "431899990000");
    assert.equal(p.referencedOrderNumber, "JPX-20261114-A8K92");
  });
  it("parses a generic PSP credit without an order note", () => {
    const p = parsePaymentEmail(F.genericCreditNoOrder)!;
    assert.equal(p.amountPaise, 34900);
    assert.equal(p.transactionRef, "431855556666");
    assert.equal(p.referencedOrderNumber, null);
  });
  it("parses a Slice credit alert with order reference", () => {
    const p = parsePaymentEmail(F.sliceCreditWithOrder)!;
    assert.equal(p.parser, "slice");
    assert.equal(p.amountPaise, 19900);
    assert.equal(p.transactionRef, "431812345678");
    assert.equal(p.referencedOrderNumber, "JPX-20261114-A8K92");
    assert.equal(p.payerHandle, "steve@okaxis");
  });
  it("ignores debit alerts", () => {
    assert.equal(parsePaymentEmail(F.debitAlert), null);
  });
  it("picks the credited amount, not the balance", () => {
    assert.equal(extractAmountPaise("credited with INR 199.00. Available balance INR 5,000.00"), 19900);
  });
  it("parses IST timestamps", () => {
    assert.equal(extractTimestamp("on 14-11-2026 10:30")?.toISOString(), "2026-11-14T05:00:00.000Z");
  });
});

describe("sender trust", () => {
  it("accepts trusted domains and rejects others", () => {
    assert.equal(isTrustedSender(F.hdfcCreditWithOrder, TRUSTED).trusted, true);
    assert.equal(isTrustedSender(F.sliceCreditWithOrder, TRUSTED).trusted, true);
    assert.equal(isTrustedSender(F.untrustedSender, TRUSTED).trusted, false);
  });
  it("rejects spoofed mail that failed DKIM/DMARC", () => {
    assert.equal(isTrustedSender(F.spoofed, TRUSTED).trusted, false);
  });
});

describe("matching decisions", () => {
  const parsed = parsePaymentEmail(F.hdfcCreditWithOrder)!;
  it("auto-confirms a high-confidence match", () => {
    const d = decideMatch({ ...base, parsed, referencedOrder: order(), amountCandidates: [] });
    assert.equal(d.status, "MATCHED");
    assert.ok(d.status === "MATCHED" && d.confidence === "HIGH" && d.action === "PAID");
  });
  it("leaves high-confidence matches for admin when auto-confirm is off", () => {
    const d = decideMatch({ ...base, autoConfirmHighConfidence: false, parsed, referencedOrder: order(), amountCandidates: [] });
    assert.ok(d.status === "MATCHED" && d.action === "MATCHED");
  });
  it("rejects a duplicate transaction reference", () => {
    const d = decideMatch({ ...base, transactionRefAlreadyUsed: true, parsed, referencedOrder: order(), amountCandidates: [] });
    assert.equal(d.status, "DUPLICATE");
  });
  it("leaves amount mismatches unmatched", () => {
    const d = decideMatch({ ...base, parsed, referencedOrder: order({ totalPaise: 29900 }), amountCandidates: [] });
    assert.equal(d.status, "UNMATCHED");
  });
  it("leaves already-paid orders unmatched", () => {
    const d = decideMatch({ ...base, parsed, referencedOrder: order({ paymentStatus: "PAID" }), amountCandidates: [] });
    assert.equal(d.status, "UNMATCHED");
  });
  it("rejects payments outside the time window", () => {
    const d = decideMatch({ ...base, parsed: { ...parsed, transactionAt: new Date("2026-11-15T05:00:00Z") }, referencedOrder: order(), amountCandidates: [] });
    assert.equal(d.status, "UNMATCHED");
  });
  const noNote = parsePaymentEmail(F.genericCreditNoOrder)!;
  it("flags ambiguous amount-only matches", () => {
    const d = decideMatch({ ...base, parsed: noNote, referencedOrder: null, amountCandidates: [order({ id: "a", totalPaise: 34900 }), order({ id: "b", totalPaise: 34900 })] });
    assert.equal(d.status, "AMBIGUOUS");
  });
  it("amount-only single match needs admin confirmation", () => {
    const d = decideMatch({ ...base, parsed: noNote, referencedOrder: null, amountCandidates: [order({ id: "a", totalPaise: 34900 })] });
    assert.ok(d.status === "MATCHED" && d.confidence === "MEDIUM" && d.action === "MATCHED");
  });
  it("unmatched when no order has the amount", () => {
    const d = decideMatch({ ...base, parsed: noNote, referencedOrder: null, amountCandidates: [] });
    assert.equal(d.status, "UNMATCHED");
  });
});
