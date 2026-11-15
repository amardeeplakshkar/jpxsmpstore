import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "components/admin/page-header";
import { ProductTable } from "components/admin/product-table";
import { Button } from "components/ui/button";
import { EmptyState } from "components/ui/empty-state";
import { listProductsAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";

export default async function AdminProductsPage() {
  await requireAdminPage("products.manage");
  const rows = await listProductsAdmin();
  return (
    <div>
      <PageHeader
        title="Products"
        description="Ranks, crates, coins and custom products. Use the arrows to reorder within a type."
        actions={
          <Button asChild>
            <Link href="/admin/products/new"><Plus /> New product</Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="No products yet" description="Create your first rank, crate or coin pack to start selling." action={<Button asChild><Link href="/admin/products/new">Create product</Link></Button>} />
      ) : (
        <ProductTable
          rows={rows.map(({ product: p, category }) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            type: p.type,
            imageUrl: p.imageUrl,
            regularPricePaise: p.regularPricePaise,
            salePricePaise: p.salePricePaise,
            isActive: p.isActive,
            isFeatured: p.isFeatured,
            category: category?.name ?? null,
          }))}
        />
      )}
    </div>
  );
}
