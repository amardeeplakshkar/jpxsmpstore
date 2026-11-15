import { randomInt } from "node:crypto";

// No 0/O/1/I/L to keep order numbers readable when typed into UPI notes or support chats.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** JPX-YYYYMMDD-XXXXX using a CSPRNG (31^5 ≈ 28.6M combinations per day). The DB unique index is the final guard. */
export function generateOrderNumber(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60 * 1000); // Asia/Kolkata date
  const ymd = ist.toISOString().slice(0, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `JPX-${ymd}-${suffix}`;
}

export const ORDER_NUMBER_RE = /JPX-?(\d{8})-?([2-9A-HJKMNP-Z]{5})/i;

/** Finds an order number in free text (UPI notes often strip hyphens). Returns canonical form. */
export function findOrderNumber(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = ORDER_NUMBER_RE.exec(text.toUpperCase());
  return m ? `JPX-${m[1]}-${m[2]}` : null;
}
