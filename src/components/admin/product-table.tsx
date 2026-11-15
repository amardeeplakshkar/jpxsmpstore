"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { Switch } from "components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { api } from "lib/client-api";
import { formatINR } from "lib/utils";

type Row = { id: string; name: string; slug: string; type: string; imageUrl: string | null; regularPricePaise: number; salePricePaise: number | null; isActive: boolean; isFeatured: boolean; category: string | null };

export function ProductTable({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(initial);
  React.useEffect(() => setRows(initial), [initial]);

  async function toggle(id: string, field: "isActive" | "isFeatured", value: boolean) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    try {
      await api(`/api/admin/products/${id}`, { method: "PATCH", json: { [field]: value } });
      toast.success("Updated");
    } catch (err) {
      toast.error((err as Error).message);
      router.refresh();
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length || rows[target].type !== rows[index].type) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    try {
      await api("/api/admin/products/reorder", { method: "POST", json: { ids: next.filter((r) => r.type === rows[index].type).map((r) => r.id) } });
    } catch (err) {
      toast.error((err as Error).message);
      router.refresh();
    }
  }

  return (
    <Table>
      <THead>
        <tr><TH>Order</TH><TH>Product</TH><TH>Type</TH><TH>Price</TH><TH>Active</TH><TH>Featured</TH><TH className="text-right">Actions</TH></tr>
      </THead>
      <TBody>
        {rows.map((p, i) => (
          <TR key={p.id}>
            <TD>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0 || rows[i - 1].type !== p.type} onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === rows.length - 1 || rows[i + 1].type !== p.type} onClick={() => move(i, 1)}><ArrowDown /></Button>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted">{p.type}</span>}
                </div>
                <div>
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-secondary">{p.name}</Link>
                  <p className="text-xs text-muted">/{p.slug}{p.category ? ` · ${p.category}` : ""}</p>
                </div>
              </div>
            </TD>
            <TD><Badge variant="muted">{p.type}</Badge></TD>
            <TD>
              {p.salePricePaise !== null ? (
                <span><span className="font-semibold text-accent">{formatINR(p.salePricePaise)}</span> <span className="text-xs text-muted line-through">{formatINR(p.regularPricePaise)}</span></span>
              ) : <span className="font-semibold">{formatINR(p.regularPricePaise)}</span>}
            </TD>
            <TD><Switch checked={p.isActive} onCheckedChange={(v) => toggle(p.id, "isActive", v)} aria-label={`${p.name} active`} /></TD>
            <TD><Switch checked={p.isFeatured} onCheckedChange={(v) => toggle(p.id, "isFeatured", v)} aria-label={`${p.name} featured`} /></TD>
            <TD>
              <div className="flex justify-end gap-1">
                <Button asChild size="icon" variant="ghost" aria-label="Edit"><Link href={`/admin/products/${p.id}`}><Pencil /></Link></Button>
                <Button size="icon" variant="ghost" aria-label="Duplicate" onClick={async () => {
                  try {
                    const copy = await api<{ id: string }>(`/api/admin/products/${p.id}/duplicate`, { method: "POST", json: {} });
                    toast.success("Duplicated as inactive copy");
                    router.push(`/admin/products/${copy.id}`);
                  } catch (err) { toast.error((err as Error).message); }
                }}><Copy /></Button>
                <ConfirmDialog
                  trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="text-rose-400" /></Button>}
                  title={`Delete ${p.name}?`}
                  description="The product is removed from the store. Existing orders keep their product snapshot."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    try {
                      await api(`/api/admin/products/${p.id}`, { method: "DELETE" });
                      toast.success("Product deleted");
                      router.refresh();
                    } catch (err) { toast.error((err as Error).message); }
                  }}
                />
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
