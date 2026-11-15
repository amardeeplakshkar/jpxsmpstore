import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionButton } from "components/admin/action-button";
import { JsonFormDialog, type FormFieldSpec } from "components/admin/json-form-dialog";
import { PageHeader } from "components/admin/page-header";
import { Badge } from "components/ui/badge";
import { EmptyState } from "components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { listCategoriesAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";

const fields: FormFieldSpec[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "slug", label: "Slug", type: "text", required: true, hint: "lowercase-with-hyphens" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "productType", label: "Shown on page", type: "select", options: [{ value: "", label: "All pages" }, { value: "RANK", label: "Ranks" }, { value: "CRATE", label: "Crates" }, { value: "COINS", label: "Coins" }, { value: "CUSTOM", label: "More" }] },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "isActive", label: "Active", type: "switch" },
];

export default async function CategoriesPage() {
  await requireAdminPage("categories.manage");
  const rows = await listCategoriesAdmin();
  return (
    <div>
      <PageHeader title="Categories" description="Group products into filterable sections." actions={<JsonFormDialog title="New category" triggerLabel="New category" icon={<Plus />} url="/api/admin/categories" method="POST" fields={fields} initial={{ isActive: true, sortOrder: 0, productType: "" }} />} />
      {rows.length === 0 ? <EmptyState title="No categories" description="Categories are optional. Create one to group products." /> : (
        <Table>
          <THead><tr><TH>Name</TH><TH>Slug</TH><TH>Page</TH><TH>Products</TH><TH>Order</TH><TH>Status</TH><TH className="text-right">Actions</TH></tr></THead>
          <TBody>
            {rows.map(({ category: c, productCount }) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD className="text-xs text-muted">{c.slug}</TD>
                <TD>{c.productType ?? "All"}</TD>
                <TD>{productCount}</TD>
                <TD>{c.sortOrder}</TD>
                <TD><Badge variant={c.isActive ? "success" : "muted"}>{c.isActive ? "Active" : "Hidden"}</Badge></TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <JsonFormDialog title={`Edit ${c.name}`} triggerLabel="Edit" icon={<Pencil />} variant="ghost" url={`/api/admin/categories/${c.id}`} method="PATCH" fields={fields}
                      initial={{ name: c.name, slug: c.slug, description: c.description ?? "", productType: c.productType ?? "", sortOrder: c.sortOrder, isActive: c.isActive }} />
                    <ActionButton url={`/api/admin/categories/${c.id}`} method="DELETE" label="Delete" icon={<Trash2 />} variant="destructive" confirm={`Delete "${c.name}"? Its products stay in the store without a category.`} successMessage="Category deleted" />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
