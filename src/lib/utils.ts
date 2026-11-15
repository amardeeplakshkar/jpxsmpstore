import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats integer paise as an INR string, e.g. 19900 -> "₹199.00". */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(rupees);
}

/** Paise -> "199.00" with exactly two decimals, computed with integers only. */
export function paiseToDecimalString(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) throw new Error("Invalid paise amount");
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return `${r}.${p.toString().padStart(2, "0")}`;
}

/** Parses "199", "199.5", "1,299.00" into integer paise without floating point. */
export function decimalStringToPaise(input: string): number | null {
  const s = input.replace(/,/g, "").trim();
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const rupees = Number(m[1]);
  const frac = (m[2] ?? "").padEnd(2, "0");
  return rupees * 100 + Number(frac);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function discordAvatarUrl(discordId: string, avatar: string | null | undefined, size = 128): string {
  if (avatar) {
    const ext = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=${size}`;
  }
  // Default avatar index for the new username system
  const idx = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export function effectivePricePaise(p: { regularPricePaise: number; salePricePaise: number | null }): number {
  if (p.salePricePaise !== null && p.salePricePaise >= 0 && p.salePricePaise < p.regularPricePaise) {
    return p.salePricePaise;
  }
  return p.regularPricePaise;
}

/** Only allow same-site relative paths as post-login redirect targets. */
export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value.slice(0, 500);
}
