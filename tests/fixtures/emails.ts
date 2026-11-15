import type { NormalizedEmail } from "../../worker/src/types";

const base = (over: Partial<NormalizedEmail>): NormalizedEmail => ({
  messageId: `<${Math.random().toString(36).slice(2)}@bank.test>`,
  mailbox: "INBOX",
  imapUid: 1,
  from: "alerts@hdfcbank.net",
  subject: "You have received a payment",
  text: "",
  receivedAt: new Date("2026-11-14T05:00:00Z"),
  authResults: "mx.google.com; dkim=pass header.d=hdfcbank.net; spf=pass",
  ...over,
});

export const hdfcCreditWithOrder = base({
  subject: "Rs.199.00 credited to your account",
  text: "Dear Customer, Rs.199.00 has been credited to your account **1234 by VPA steve@okicici STEVE on 14-11-26. Remarks: JPX-20261114-A8K92. Your UPI transaction reference number is 431812345678.",
});

export const iciciCreditNoHyphens = base({
  from: "credit_cards@icicibank.com",
  subject: "Transaction alert",
  text: "Your account XX123 is credited with INR 199.00 on 14-Nov-26. Info: UPI/431899990000/JPX20261114A8K92/steve@ybl. Available balance INR 5,000.00",
});

export const genericCreditNoOrder = base({
  from: "noreply@phonepe.com",
  subject: "Payment received",
  text: "You have received ₹349.00 from Alex via UPI. UPI Ref No: 431855556666. Date: 14/11/2026 10:31 AM",
});

export const debitAlert = base({
  text: "Rs.500.00 has been debited from your account **1234 to VPA shop@okaxis on 14-11-26. UPI Ref 431800001111.",
  subject: "Debit alert",
});

export const spoofed = base({
  from: "alerts@hdfcbank.net",
  authResults: "mx.google.com; dkim=fail; spf=fail; dmarc=fail",
  text: hdfcCreditWithOrder.text,
});

export const untrustedSender = base({ from: "random@gmail.com", text: hdfcCreditWithOrder.text });
