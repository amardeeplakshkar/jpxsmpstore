import { jsonLd } from "lib/seo";

/** Structured data (schema.org) so Google can show rich results: product price, breadcrumbs, site name. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
