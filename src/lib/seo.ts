import { appUrl } from "lib/env";

/** Absolute site URL ("https://store.example.com"), or null if NEXT_PUBLIC_APP_URL is missing/invalid. */
export function siteUrl(): string | null {
  try {
    return appUrl();
  } catch {
    return null;
  }
}

/** Makes a path or URL absolute against the site URL (search engines and social cards need absolute URLs). */
export function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = siteUrl();
  return base ? `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}` : undefined;
}

/** Plain-text summary for meta descriptions: strips markup/markdown, collapses whitespace, trims to ~160 chars on a word boundary. */
export function metaDescription(...candidates: (string | null | undefined)[]): string | undefined {
  for (const c of candidates) {
    if (!c) continue;
    const text = c
      .replace(/<[^>]+>/g, " ")
      .replace(/[*_`#>~[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    if (text.length <= 160) return text;
    const cut = text.slice(0, 157);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 120))}...`;
  }
  return undefined;
}

/** Serialises JSON-LD safely for a <script> tag (escapes "<" so content can't close the tag). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Metadata for pages that should never appear in search results (per-user pages). */
export const NOINDEX = { robots: { index: false, follow: false } } as const;
