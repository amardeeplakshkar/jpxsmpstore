import type { NormalizedEmail } from "../types";

/**
 * A sender is trusted if it matches an exact address ("alerts@hdfcbank.net") or a domain entry
 * ("@hdfcbank.net" or "hdfcbank.net"). If the receiving server recorded a DKIM/DMARC failure, the
 * email is never trusted, which protects against spoofed From headers.
 */
export function isTrustedSender(email: NormalizedEmail, trusted: string[]): { trusted: boolean; reason: string } {
  const from = email.from.toLowerCase();
  const domain = from.split("@")[1] ?? "";
  if (email.authResults && /\b(dkim|dmarc|spf)=fail\b/i.test(email.authResults)) {
    return { trusted: false, reason: "Authentication-Results reports dkim/dmarc/spf failure" };
  }
  for (const entryRaw of trusted) {
    const entry = entryRaw.trim().toLowerCase();
    if (!entry) continue;
    if (entry.includes("@") && !entry.startsWith("@")) {
      if (from === entry) return { trusted: true, reason: `exact sender ${entry}` };
    } else {
      const d = entry.replace(/^@/, "");
      if (domain === d || domain.endsWith(`.${d}`)) return { trusted: true, reason: `trusted domain ${d}` };
    }
  }
  return { trusted: false, reason: `sender ${from} is not in the trusted sender list` };
}
