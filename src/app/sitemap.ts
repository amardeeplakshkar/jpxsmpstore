import type { MetadataRoute } from "next";
import { listGameModes, listProducts } from "lib/products/queries";
import { siteUrl } from "lib/seo";

// Rebuilt at most hourly; product/mode changes appear on the next rebuild.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  if (!base) return [];
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/ranks`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/crates`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/coins`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  // If the DB is unreachable, still serve the static part rather than an error.
  const [products, modes] = await Promise.all([listProducts({ limit: 1000 }).catch(() => []), listGameModes().catch(() => [])]);
  return [
    ...fixed,
    ...modes.map((m) => ({ url: `${base}/${m.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: p.isFeatured ? 0.8 : 0.6,
      images: p.imageUrl && /^https?:/i.test(p.imageUrl) ? [p.imageUrl] : undefined,
    })),
  ];
}
