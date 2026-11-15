import { notFound } from "next/navigation";
import { PageHeader } from "components/admin/page-header";
import { ProductForm } from "components/admin/product-form";
import { getProductForEdit } from "lib/admin/products";
import { listCategoriesAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("products.manage");
  const { id } = await params;
  const [p, cats] = await Promise.all([getProductForEdit(id), listCategoriesAdmin()]);
  if (!p) notFound();
  return (
    <div>
      <PageHeader title={`Edit ${p.name}`} description={`/product/${p.slug}`} />
      <ProductForm
        categories={cats.map((c) => ({ id: c.category.id, name: c.category.name }))}
        initial={{
          id: p.id,
          type: p.type,
          name: p.name,
          slug: p.slug,
          categoryId: p.categoryId,
          shortDescription: p.shortDescription,
          description: p.description,
          imageUrl: p.imageUrl,
          gallery: p.images.map((i) => i.url),
          regularPricePaise: p.regularPricePaise,
          salePricePaise: p.salePricePaise,
          javaAvailable: p.javaAvailable,
          bedrockAvailable: p.bedrockAvailable,
          isFeatured: p.isFeatured,
          isActive: p.isActive,
          sortOrder: p.sortOrder,
          metadata: p.metadata,
        }}
      />
    </div>
  );
}
