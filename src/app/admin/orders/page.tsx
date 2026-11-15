import Link from "next/link";
import { PageHeader } from "components/admin/page-header";
import { Pagination } from "components/admin/pagination";
import { Button } from "components/ui/button";
import { EmptyState } from "components/ui/empty-state";
import { Input, NativeSelect } from "components/ui/input";
import { StatusBadge } from "components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES } from "db/schema";
import { listOrdersAdmin, orderFiltersSchema } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { formatDateTime, formatINR } from "lib/utils";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdminPage("orders.view");
  const sp = await searchParams;
  const f = orderFiltersSchema.parse(sp);
  const data = await listOrdersAdmin(f);
  return (
    <div>
      <PageHeader title="Orders" description="Search, filter and manage every order." />
      <form className="mb-4 grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <Input name="q" placeholder="Order ID" defaultValue={f.q} aria-label="Order ID" />
        <Input name="discord" placeholder="Discord username or ID" defaultValue={f.discord} aria-label="Discord username" />
        <Input name="mc" placeholder="Minecraft username" defaultValue={f.mc} aria-label="Minecraft username" />
        <Input name="product" placeholder="Product" defaultValue={f.product} aria-label="Product" />
        <NativeSelect name="purchaseType" defaultValue={f.purchaseType ?? ""} aria-label="Purchase type">
          <option value="">Any purchase type</option>
          <option value="SELF">Self</option>
          <option value="GIFT">Gift</option>
        </NativeSelect>
        <NativeSelect name="edition" defaultValue={f.edition ?? ""} aria-label="Game edition">
          <option value="">Any edition</option>
          <option value="JAVA">Java</option>
          <option value="BEDROCK">Bedrock</option>
        </NativeSelect>
        <NativeSelect name="payment" defaultValue={f.payment ?? ""} aria-label="Payment status">
          <option value="">Any payment status</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
        <NativeSelect name="fulfillment" defaultValue={f.fulfillment ?? ""} aria-label="Fulfillment status">
          <option value="">Any fulfillment status</option>
          {FULFILLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
        <Input name="from" type="date" defaultValue={f.from} aria-label="From date" />
        <div className="flex gap-2">
          <Input name="to" type="date" defaultValue={f.to} aria-label="To date" />
          <Button type="submit">Filter</Button>
        </div>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState title="No orders found" description="Try changing the filters." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Customer</TH>
              <TH>Product</TH>
              <TH>Player</TH>
              <TH>Total</TH>
              <TH>Payment</TH>
              <TH>Fulfillment</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <TBody>
            {data.rows.map(({ order: o, username, product }) => (
              <TR key={o.id}>
                <TD>
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-secondary hover:underline">{o.orderNumber}</Link>
                </TD>
                <TD>{username}</TD>
                <TD className="max-w-48 truncate">{product}</TD>
                <TD>
                  {o.minecraftUsername}
                  <span className="block text-xs text-muted">{o.gameEdition} · {o.purchaseType}</span>
                </TD>
                <TD className="font-semibold">{formatINR(o.totalPaise)}</TD>
                <TD><StatusBadge status={o.paymentStatus} /></TD>
                <TD><StatusBadge status={o.fulfillmentStatus} /></TD>
                <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(o.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} total={data.total} basePath="/admin/orders" params={sp} />
    </div>
  );
}
