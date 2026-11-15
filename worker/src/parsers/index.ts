import type { NormalizedEmail, ParsedPayment, PaymentEmailParser } from "../types";
import { baseParse, collapse, CREDIT_RE, DEBIT_RE } from "./extract";

function textOf(e: NormalizedEmail) {
  return collapse(`${e.subject}\n${e.text}`);
}

function domainOf(addr: string) {
  return addr.split("@")[1]?.toLowerCase() ?? "";
}

/** Factory for bank/PSP-specific parsers that differ mainly by sender domain and wording. */
function senderParser(name: string, domains: string[], extra?: (text: string, p: ParsedPayment) => ParsedPayment): PaymentEmailParser {
  return {
    name,
    canParse: (e) => domains.some((d) => domainOf(e.from) === d || domainOf(e.from).endsWith(`.${d}`)),
    parse: (e) => {
      const text = textOf(e);
      if (!CREDIT_RE.test(text)) return null;
      const p = baseParse(name, text);
      return extra ? extra(text, p) : p;
    },
  };
}

export const hdfcParser = senderParser("hdfc", ["hdfcbank.net", "hdfcbank.com"]);
export const iciciParser = senderParser("icici", ["icicibank.com"], (text, p) => {
  // ICICI: "Info: UPI/431812345678/JPX20261114A8K92/payer@ybl"
  const info = /UPI\/(\d{12})\/([^/\n]*)\/([^\s/]+)/i.exec(text);
  return info ? { ...p, transactionRef: info[1], note: info[2] || p.note, payerHandle: info[3].toLowerCase() } : p;
});
export const sbiParser = senderParser("sbi", ["sbi.co.in", "alerts.sbi.co.in"]);
export const axisParser = senderParser("axis", ["axisbank.com"]);
export const kotakParser = senderParser("kotak", ["kotak.com"]);
export const paytmParser = senderParser("paytm-business", ["paytm.com", "paytmbank.com"]);
export const phonepeParser = senderParser("phonepe-business", ["phonepe.com"]);
export const gpayParser = senderParser("gpay-business", ["google.com"]);

/** Fallback for any trusted sender: requires explicit credit wording, an amount and no debit-only wording. */
export const genericParser: PaymentEmailParser = {
  name: "generic-upi",
  canParse: () => true,
  parse: (e) => {
    const text = textOf(e);
    if (!CREDIT_RE.test(text)) return null;
    if (DEBIT_RE.test(text) && !/\bcredited\b/i.test(text)) return null;
    if (!/\bupi\b|\bvpa\b|@\w+/i.test(text)) return null;
    return baseParse("generic-upi", text);
  },
};

/** Order matters: specific parsers first, generic last. Add new providers here. */
export const PARSERS: PaymentEmailParser[] = [
  hdfcParser,
  iciciParser,
  sbiParser,
  axisParser,
  kotakParser,
  paytmParser,
  phonepeParser,
  gpayParser,
  genericParser,
];

export function parsePaymentEmail(email: NormalizedEmail, parsers: PaymentEmailParser[] = PARSERS): ParsedPayment | null {
  for (const parser of parsers) {
    if (!parser.canParse(email)) continue;
    const result = parser.parse(email);
    if (result) return result;
  }
  return null;
}
