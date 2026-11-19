import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Shared data cache for read-mostly storefront data (settings, catalog, game modes, server status).
 * On Vercel this is the cross-instance Data Cache, so most page loads and API calls never touch
 * Supabase at all. Admin writes call invalidateStoreCache() (see lib/api route wrapper) so changes
 * show up immediately; the revalidate window is only a safety net.
 */
export const TAGS = { settings: "settings", catalog: "catalog", status: "server-status" } as const;
export type CacheTag = (typeof TAGS)[keyof typeof TAGS];

// unstable_cache stores JSON, which turns Date objects into strings. Tag them so they round-trip.
const DATE_KEY = "__jpxDate";
function encode<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, function (this: Record<string, unknown>, key, val) {
      const raw = this[key];
      return raw instanceof Date ? { [DATE_KEY]: raw.toISOString() } : val;
    }),
  );
}
function decode<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value), (_k, val) =>
    val && typeof val === "object" && typeof val[DATE_KEY] === "string" && Object.keys(val).length === 1 ? new Date(val[DATE_KEY]) : val,
  ) as T;
}

const canUseNextCache = () => process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge";

/** Wraps an async loader in the Next.js data cache, keyed by name + arguments and tagged for invalidation. */
export function cached<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
  opts: { tags: CacheTag[]; revalidate?: number },
): (...args: A) => Promise<R> {
  const inner = unstable_cache(async (...args: A) => encode(await fn(...args)), [`jpx:${name}`], {
    tags: opts.tags,
    revalidate: opts.revalidate ?? 300,
  });
  return async (...args: A) => {
    // Scripts (seed, worker, tests) run outside Next.js and have no cache store.
    if (!canUseNextCache()) return fn(...args);
    try {
      return decode<R>(await inner(...args));
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("incrementalCache") || msg.includes("static generation store")) return fn(...args);
      throw err;
    }
  };
}

export function invalidateStoreCache(tags: CacheTag[] = [TAGS.settings, TAGS.catalog]) {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (err) {
      console.warn("[cache] revalidate failed", tag, (err as Error).message);
    }
  }
}
