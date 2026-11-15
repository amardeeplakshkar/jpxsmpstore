import Link from "next/link";
import { ProductGrid } from "components/products/product-card";
import { EmptyState } from "components/ui/empty-state";
import type { ProductType } from "db/schema";
import { listCategories, listProducts } from "lib/products/queries";
import { cn } from "lib/utils";

export async function CategoryPage({ type, title, subtitle, basePath, categorySlug }: { type: ProductType; title: string; subtitle: string; basePath: string; categorySlug?: string }) {
  const [products, categories] = await Promise.all([listProducts({ type, categorySlug }), listCategories()]);
  const relevant = categories.filter((c) => c.productType === type || c.productType === null);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
      </header>
      {relevant.length > 1 && (
        <nav aria-label="Categories" className="mb-6 flex flex-wrap gap-2">
          <Link href={basePath} className={cn("rounded-lg border px-3 py-1.5 text-sm", !categorySlug ? "border-primary bg-primary/20" : "border-border hover:border-primary/50")}>
            All
          </Link>
          {relevant.map((c) => (
            <Link
              key={c.id}
              href={`${basePath}?category=${c.slug}`}
              className={cn("rounded-lg border px-3 py-1.5 text-sm", categorySlug === c.slug ? "border-primary bg-primary/20" : "border-border hover:border-primary/50")}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      {products.length === 0 ? (
        <EmptyState title="Nothing here yet" description="No products are available in this section right now." />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
