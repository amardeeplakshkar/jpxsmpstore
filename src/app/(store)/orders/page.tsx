import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Receipt } from "lucide-react";
import { db } from "db/client";
import { orders } from "db/schema";
import { Button } from "components/ui/button";
import { EmptyState } from "components/ui/empty-state";
import { StatusBadge } from "components/ui/status-badge";
import { requireUserPage } from "lib/auth/guards";
import { formatDateTime, formatINR } from "lib/utils";

export const metadata = { title: "Order history" };

export default async function OrdersPage() {
  const user = await requireUserPage("/orders");
  const rows = await db.query.orders.findMany({ where: eq(orders.userId, user.id), orderBy: [desc(orders.createdAt)], limit: 100, with: { items: true } });
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-black">Order history</h1>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-6" />}
          title="No orders yet"
          description="When you buy something, it will show up here."
          action={
            <Button asChild>
              <Link href="/ranks">Browse the store</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.orderNumber}`} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm text-secondary">{o.orderNumber}</p>
                  <p className="font-semibold">{o.items.map((i) => i.productSnapshot.name).join(", ")}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(o.createdAt)} · {o.purchaseType === "GIFT" ? "Gift to" : "For"} {o.minecraftUsername} ({o.gameEdition === "JAVA" ? "Java" : "Bedrock"})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge status={o.paymentStatus} prefix="Payment" />
                  <StatusBadge status={o.fulfillmentStatus} prefix="Delivery" />
                  <span className="font-bold text-accent">{formatINR(o.totalPaise)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
