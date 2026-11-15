import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "components/admin/action-button";
import { PageHeader } from "components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { StatusBadge } from "components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { getUserAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { hasPermission } from "lib/permissions";
import { discordAvatarUrl, formatDate, formatDateTime, formatINR } from "lib/utils";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("users.view");
  const { id } = await params;
  const data = await getUserAdmin(id);
  if (!data) notFound();
  const { user: u, orders } = data;
  const paid = orders.filter((o) => o.paymentStatus === "PAID");
  const gifts = orders.filter((o) => o.purchaseType === "GIFT");
  const canBlock = hasPermission(admin.adminRole, "users.block") && u.id !== admin.id;
  return (
    <div className="space-y-6">
      <PageHeader
        title={u.globalName ?? u.username}
        description={`@${u.username} · ${u.discordId}`}
        actions={canBlock ? (u.status === "ACTIVE" ? (
          <ActionButton url={`/api/admin/users/${u.id}`} body={{ action: "block" }} label="Block user" variant="destructive" fields={[{ name: "reason", label: "Reason", type: "textarea", required: true }]} dialogDescription="Blocked users are logged out and cannot log in or purchase." />
        ) : (
          <ActionButton url={`/api/admin/users/${u.id}`} body={{ action: "unblock" }} label="Unblock user" confirm="Allow this user to log in and purchase again?" />
        )) : undefined}
      />
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={discordAvatarUrl(u.discordId, u.avatar, 128)} alt="" className="size-24 rounded-xl border border-border" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Mini label="Status" value={<StatusBadge status={u.status} />} />
          <Mini label="Registered" value={formatDate(u.createdAt)} />
          <Mini label="Last login" value={formatDateTime(u.lastLoginAt)} />
          <Mini label="Total spent" value={formatINR(paid.reduce((s, o) => s + o.totalPaise, 0))} />
          {u.blockedReason && <Mini label="Block reason" value={u.blockedReason} />}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Orders ({orders.length})</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? <p className="text-sm text-muted">No orders.</p> : <OrderTable orders={orders} />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Gift history ({gifts.length})</CardTitle></CardHeader>
        <CardContent>
          {gifts.length === 0 ? <p className="text-sm text-muted">No gifts sent.</p> : <OrderTable orders={gifts} />}
        </CardContent>
      </Card>
    </div>
  );
}

type O = NonNullable<Awaited<ReturnType<typeof getUserAdmin>>>["orders"];
function OrderTable({ orders }: { orders: O }) {
  return (
    <Table>
      <THead><tr><TH>Order</TH><TH>Product</TH><TH>Recipient</TH><TH>Total</TH><TH>Payment</TH><TH>Fulfillment</TH><TH>Date</TH></tr></THead>
      <TBody>
        {orders.map((o) => (
          <TR key={o.id}>
            <TD><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-secondary hover:underline">{o.orderNumber}</Link></TD>
            <TD>{o.items.map((i) => i.productSnapshot.name).join(", ")}</TD>
            <TD>{o.minecraftUsername} <span className="text-xs text-muted">({o.gameEdition})</span></TD>
            <TD>{formatINR(o.totalPaise)}</TD>
            <TD><StatusBadge status={o.paymentStatus} /></TD>
            <TD><StatusBadge status={o.fulfillmentStatus} /></TD>
            <TD className="text-xs text-muted">{formatDateTime(o.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs uppercase text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
