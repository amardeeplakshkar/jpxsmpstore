import { findOrderNumber } from "lib/orders/number";
import { decimalStringToPaise } from "lib/utils";

export function collapse(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;

export const CREDIT_RE = /\b(credited|received|deposited|has been added|money added|payment received|credit(?:ed)? alert)\b/i;
export const DEBIT_RE = /\b(debited|sent to|paid to|withdrawn|debit alert|spent)\b/i;

/** Picks the amount closest to (and preferably after) a credit keyword. */
export function extractAmountPaise(text: string): number | null {
  const amounts: { index: number; paise: number }[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const p = decimalStringToPaise(m[1]);
    if (p !== null && p > 0) amounts.push({ index: m.index ?? 0, paise: p });
  }
  if (amounts.length === 0) return null;
  const kw = CREDIT_RE.exec(text);
  if (!kw) return amounts[0].paise;
  const k = kw.index;
  amounts.sort((a, b) => Math.abs(a.index - k) - Math.abs(b.index - k));
  return amounts[0].paise;
}

const LABELLED_REF_RE =
  /(?:upi\s*(?:ref(?:erence)?|txn|transaction)(?:\s*(?:no\.?|number|id))?|utr(?:\s*(?:no\.?|number))?|rrn|ref(?:erence)?\s*(?:no\.?|number|id)|transaction\s*(?:id|reference(?:\s*number)?))\s*(?:is)?\s*[:#.\-]?\s*([A-Z0-9]{10,35})/i;
const UPI_SLASH_RE = /UPI\/(?:[A-Z]+\/)?(\d{12})\//i;
const TWELVE_DIGITS_RE = /(?<![\d])(\d{12})(?![\d])/;

export function extractTransactionRef(text: string): string | null {
  const labelled = LABELLED_REF_RE.exec(text);
  if (labelled) return labelled[1].toUpperCase();
  const slash = UPI_SLASH_RE.exec(text);
  if (slash) return slash[1];
  if (/\bupi\b/i.test(text)) {
    const t = TWELVE_DIGITS_RE.exec(text);
    if (t) return t[1];
  }
  return null;
}

const VPA_RE = /\b([a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9]{1,63})\b/i;
export function extractPayerHandle(text: string, exclude: string[] = []): string | null {
  for (const m of text.matchAll(new RegExp(VPA_RE.source, "gi"))) {
    const v = m[1].toLowerCase();
    if (v.includes(".") && /\.(com|net|in|org|co)$/.test(v)) continue; // email address, not a VPA
    if (!exclude.includes(v)) return v;
  }
  return null;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/**
 * Parses common Indian bank date formats as IST. Returns null if no date AND time are present:
 * a date-only value would be midnight and could wrongly fail the time-window check, so the
 * caller falls back to the email's received time instead.
 */
export function extractTimestamp(text: string): Date | null {
  const time = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i.exec(text);
  // A date without a time would be midnight and could wrongly fail the time-window check,
  // so return null and let the caller fall back to the email received time.
  if (!time) return null;
  let h = time ? Number(time[1]) : 0;
  const min = time ? Number(time[2]) : 0;
  const sec = time?.[3] ? Number(time[3]) : 0;
  if (time?.[4]) {
    const pm = time[4].toLowerCase() === "pm";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  const build = (y: number, mo: number, d: number) => {
    const year = y < 100 ? 2000 + y : y;
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
    // Convert IST wall-clock to UTC
    return new Date(Date.UTC(year, mo, d, h, min, sec) - 330 * 60 * 1000);
  };
  const numeric = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(text);
  if (numeric) return build(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));
  const named = /\b(\d{1,2})[-\s]?([A-Za-z]{3})[a-z]*[-\s,]?\s?(\d{2,4})\b/.exec(text);
  if (named && MONTHS[named[2].toLowerCase()] !== undefined) {
    return build(Number(named[3]), MONTHS[named[2].toLowerCase()], Number(named[1]));
  }
  return null;
}

const NOTE_RE = /(?:remarks?|note|message|purpose|info)\s*[:\-]\s*([^\n]{1,140})/i;
export function extractNote(text: string): string | null {
  const m = NOTE_RE.exec(text);
  return m ? m[1].trim() : null;
}

export function baseParse(name: string, text: string): {
  direction: "CREDIT" | "DEBIT";
  amountPaise: number | null;
  transactionRef: string | null;
  transactionAt: Date | null;
  payerHandle: string | null;
  note: string | null;
  referencedOrderNumber: string | null;
  parser: string;
} {
  return {
    parser: name,
    direction: CREDIT_RE.test(text) ? "CREDIT" : "DEBIT",
    amountPaise: extractAmountPaise(text),
    transactionRef: extractTransactionRef(text),
    transactionAt: extractTimestamp(text),
    payerHandle: extractPayerHandle(text),
    note: extractNote(text),
    referencedOrderNumber: findOrderNumber(text),
  };
}
