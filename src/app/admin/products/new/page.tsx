import { PageHeader } from "components/admin/page-header";
import { ProductForm } from "components/admin/product-form";
import { listCategoriesAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";

export default async function NewProductPage() {
  await requireAdminPage("products.manage");
  const cats = await listCategoriesAdmin();
  return (
    <div>
      <PageHeader title="New product" />
      <ProductForm categories={cats.map((c) => ({ id: c.category.id, name: c.category.name }))} />
    </div>
  );
}
