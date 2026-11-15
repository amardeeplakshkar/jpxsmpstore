import Link from "next/link";
import { PackageCheck, Play } from "lucide-react";
import { ActionButton } from "components/admin/action-button";
import { PageHeader } from "components/admin/page-header";
import { CopyButton } from "components/ui/copy-button";
import { EmptyState } from "components/ui/empty-state";
import { StatusBadge } from "components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { fulfillmentQueue } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { cn, formatDateTime } from "lib/utils";

export default async function FulfillmentPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdminPage("fulfillment.manage");
  const { view } = await searchParams;
  const status = view === "done" ? "FULFILLED" : "OPEN";
  const rows = await fulfillmentQueue(status);
  return (
    <div>
      <PageHeader title="Fulfillment" description="Paid orders waiting for in-game delivery, oldest first." />
      <div className="mb-4 flex gap-2">
        <Link href="/admin/fulfillment" className={cn("rounded-lg border px-3 py-1.5 text-sm", status === "OPEN" ? "border-primary bg-primary/20" : "border-border")}>Queue</Link>
        <Link href="/admin/fulfillment?view=done" className={cn("rounded-lg border px-3 py-1.5 text-sm", status === "FULFILLED" ? "border-primary bg-primary/20" : "border-border")}>Recently fulfilled</Link>
      </div>
      {rows.length === 0 ? <EmptyState title={status === "OPEN" ? "Queue is empty" : "Nothing fulfilled yet"} description={status === "OPEN" ? "All paid orders have been delivered." : undefined} /> : (
        <Table>
          <THead><tr><TH>Order</TH><TH>Minecraft username</TH><TH>Edition</TH><TH>Product</TH><TH>Buyer</TH><TH>Paid</TH><TH>Status</TH><TH /></tr></THead>
          <TBody>
            {rows.map((o) => {
              const url = `/api/admin/orders/${o.id}`;
              return (
                <TR key={o.id}>
                  <TD><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-secondary hover:underline">{o.orderNumber}</Link></TD>
                  <TD><span className="flex items-center gap-1 font-mono font-semibold">{o.minecraftUsername}<CopyButton value={o.minecraftUsername} size="icon" variant="ghost" label="username" /></span></TD>
                  <TD><StatusBadge status={o.gameEdition === "JAVA" ? "VERIFYING" : "MATCHED"} />{" "}<span className="text-xs">{o.gameEdition}</span></TD>
                  <TD>{o.items.map((i) => `${i.quantity}x ${i.productSnapshot.name}`).join(", ")}{o.purchaseType === "GIFT" && <span className="block text-xs text-accent">Gift</span>}</TD>
                  <TD className="text-xs">{o.user.username}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(o.paidAt)}</TD>
                  <TD><StatusBadge status={o.fulfillmentStatus} />{o.fulfillment?.fulfilledByDiscordId && <span className="block font-mono text-[10px] text-muted">by {o.fulfillment.fulfilledByDiscordId}</span>}</TD>
                  <TD>
                    {status === "OPEN" && (
                      <div className="flex gap-1">
                        {o.fulfillmentStatus !== "PROCESSING" && <ActionButton url={url} body={{ action: "start_fulfillment" }} label="Start" icon={<Play />} variant="ghost" />}
                        <ActionButton url={url} body={{ action: "mark_fulfilled" }} label="Fulfilled" icon={<PackageCheck />} variant="gold"
                          fields={[{ name: "deliveryNotes", label: "Delivery notes", type: "textarea" }, { name: "proofUrl", label: "Proof URL (optional)", type: "url" }]}
                          dialogDescription={`Deliver to ${o.minecraftUsername} (${o.gameEdition}) before confirming.`} />
                      </div>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
