import { PageHeader } from "components/admin/page-header";
import { ProductForm } from "components/admin/product-form";
import { listCategoriesAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { db } from "db/client";
import { gameModes } from "db/schema";
import { asc, isNull } from "drizzle-orm";

export default async function NewProductPage() {
  await requireAdminPage("products.manage");
  const [cats, modes] = await Promise.all([listCategoriesAdmin(), db.select().from(gameModes).where(isNull(gameModes.deletedAt)).orderBy(asc(gameModes.sortOrder))]);
  return (
    <div>
      <PageHeader title="New product" />
      <ProductForm categories={cats.map((c) => ({ id: c.category.id, name: c.category.name }))}
        gameModes={modes.map((m) => ({ id: m.id, name: m.name, allowedTypes: m.allowedTypes }))} />
    </div>
  );
}
