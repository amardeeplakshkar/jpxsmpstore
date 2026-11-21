import type { MetadataRoute } from "next";
import { siteUrl } from "lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/orders", "/account"] }],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
    host: base ?? undefined,
  };
}
