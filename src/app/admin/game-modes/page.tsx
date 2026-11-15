import { asc, count, eq, isNull } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionButton } from "components/admin/action-button";
import { JsonFormDialog, type FormFieldSpec } from "components/admin/json-form-dialog";
import { PageHeader } from "components/admin/page-header";
import { Badge } from "components/ui/badge";
import { EmptyState } from "components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { db } from "db/client";
import { gameModes, products } from "db/schema";
import { requireAdminPage } from "lib/auth/guards";

const fields: FormFieldSpec[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "slug", label: "Slug (store URL)", type: "text", required: true, hint: "e.g. survival gives /survival" },
  { name: "description", label: "Short description", type: "textarea" },
  { name: "iconUrl", label: "Icon image URL (optional)", type: "url", hint: "Upload in the Media Library and paste the URL" },
  { name: "accentColor", label: "Accent colour (hex)", type: "text", hint: "#a855f7" },
  { name: "sellsRanks", label: "Sells ranks", type: "switch" },
  { name: "sellsCrates", label: "Sells crates", type: "switch" },
  { name: "sellsCoins", label: "Sells coins", type: "switch" },
  { name: "sellsCustom", label: "Sells other items", type: "switch" },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "isActive", label: "Active", type: "switch" },
];

const TYPE_LABEL: Record<string, string> = { RANK: "Ranks", CRATE: "Crates", COINS: "Coins", CUSTOM: "Items" };

export default async function GameModesPage() {
  await requireAdminPage("categories.manage");
  const rows = await db
    .select({ mode: gameModes, productCount: count(products.id) })
    .from(gameModes)
    .leftJoin(products, eq(products.gameModeId, gameModes.id))
    .where(isNull(gameModes.deletedAt))
    .groupBy(gameModes.id)
    .orderBy(asc(gameModes.sortOrder), asc(gameModes.name));
  return (
    <div>
      <PageHeader
        title="Game modes"
        description="Each mode (e.g. Survival, PvP) gets its own store page at /slug with its own ranks, crates and items. Choose a product's mode on the product page."
        actions={<JsonFormDialog title="New game mode" triggerLabel="New game mode" icon={<Plus />} url="/api/admin/game-modes" method="POST" fields={fields} initial={{ isActive: true, sortOrder: 0, accentColor: "#a855f7", sellsRanks: true, sellsCrates: true, sellsCoins: true, sellsCustom: true }} />}
      />
      {rows.length === 0 ? (
        <EmptyState title="No game modes" description="Create Survival and PvP to give each its own store page." />
      ) : (
        <Table>
          <THead><tr><TH>Mode</TH><TH>URL</TH><TH>Sells</TH><TH>Products</TH><TH>Order</TH><TH>Status</TH><TH className="text-right">Actions</TH></tr></THead>
          <TBody>
            {rows.map(({ mode: m, productCount }) => (
              <TR key={m.id}>
                <TD className="font-semibold"><span className="mr-2 inline-block size-3 rounded-full align-middle" style={{ background: m.accentColor }} />{m.name}</TD>
                <TD className="font-mono text-xs text-muted">/{m.slug}</TD>
                <TD><div className="flex flex-wrap gap-1">{m.allowedTypes.map((t) => <Badge key={t} variant="muted">{TYPE_LABEL[t] ?? t}</Badge>)}</div></TD>
                <TD>{productCount}</TD>
                <TD>{m.sortOrder}</TD>
                <TD><Badge variant={m.isActive ? "success" : "muted"}>{m.isActive ? "Active" : "Hidden"}</Badge></TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <JsonFormDialog title={`Edit ${m.name}`} triggerLabel="Edit" icon={<Pencil />} variant="ghost" url={`/api/admin/game-modes/${m.id}`} method="PATCH" fields={fields}
                      initial={{ name: m.name, slug: m.slug, description: m.description, iconUrl: m.iconUrl ?? "", accentColor: m.accentColor, sellsRanks: m.allowedTypes.includes("RANK"), sellsCrates: m.allowedTypes.includes("CRATE"), sellsCoins: m.allowedTypes.includes("COINS"), sellsCustom: m.allowedTypes.includes("CUSTOM"), sortOrder: m.sortOrder, isActive: m.isActive }} />
                    <ActionButton url={`/api/admin/game-modes/${m.id}`} method="DELETE" label="Delete" icon={<Trash2 />} variant="destructive" confirm={`Delete "${m.name}"? Its products stay in the store without a mode.`} successMessage="Game mode deleted" />
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
