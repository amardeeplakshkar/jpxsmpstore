import Link from "next/link";
import { ProductGrid } from "components/products/product-card";
import { EmptyState } from "components/ui/empty-state";
import type { ProductType } from "db/schema";
import { getStoreDiscount, listCategories, listProducts, toCardData } from "lib/products/queries";

const MODES = [
  { href: "/ranks", label: "Ranks" },
  { href: "/crates", label: "Crates" },
  { href: "/coins", label: "Coins" },
  { href: "/shop", label: "More" },
];

/** All-modes listing for one product type (/ranks, /crates, /coins, /shop). */
export async function CategoryPage({ type, title, subtitle, basePath, categorySlug }: { type: ProductType; title: string; subtitle: string; basePath: string; categorySlug?: string }) {
  const [products, categories, discount] = await Promise.all([listProducts({ type, categorySlug }), listCategories(), getStoreDiscount()]);
  const relevant = categories.filter((c) => c.productType === type || c.productType === null);
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:py-16">
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-2 font-semibold text-muted">{subtitle}</p>
        </div>
        <nav aria-label="Store sections" className="flex flex-wrap gap-3">
          {MODES.map((m) => (
            <Link key={m.href} href={m.href} className="tab-pill" data-active={m.href === basePath}>
              {m.label}
            </Link>
          ))}
        </nav>
      </header>
      {relevant.length > 1 && (
        <nav aria-label="Categories" className="mb-10 flex flex-wrap gap-3">
          <Link href={basePath} className="tab-pill" data-active={!categorySlug}>All</Link>
          {relevant.map((c) => (
            <Link key={c.id} href={`${basePath}?category=${c.slug}`} className="tab-pill" data-active={categorySlug === c.slug}>
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      {products.length === 0 ? (
        <EmptyState title="Nothing here yet" description="No products are available in this section right now." />
      ) : (
        <ProductGrid products={products.map((p) => toCardData(p, discount))} />
      )}
    </div>
  );
}
