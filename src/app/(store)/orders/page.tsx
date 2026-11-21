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

export const metadata = { title: "Order history", robots: { index: false, follow: false } };

// Per-user page: always rendered on request (never cached).
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUserPage("/orders");
  const rows = await db.query.orders.findMany({ where: eq(orders.userId, user.id), orderBy: [desc(orders.createdAt)], limit: 100, with: { items: true } });
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <h1 className="mb-2 text-4xl font-black tracking-tight">Order History</h1>
      <p className="mb-8 font-semibold text-muted">Every purchase made with your Discord account.</p>
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
              <Link href={`/orders/${o.orderNumber}`} className="flex flex-col gap-4 rounded-xl border border-transparent bg-sunken px-6 py-5 shadow-[0_5px_15px_rgb(0_0_0/0.2)] transition hover:-translate-y-0.5 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-primary">{o.orderNumber}</p>
                  <p className="text-base font-black text-white">{o.items.map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ""}${i.productSnapshot.name}${i.productSnapshot.gameModeName ? ` (${i.productSnapshot.gameModeName})` : ""}`).join(", ")}</p>
                  <p className="text-[13px] font-bold text-slate-500">
                    {formatDateTime(o.createdAt)} · {o.purchaseType === "GIFT" ? "Gift to" : "For"} {o.minecraftUsername} ({o.gameEdition === "JAVA" ? "Java" : "Bedrock"})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge status={o.paymentStatus} prefix="Payment" />
                  <StatusBadge status={o.fulfillmentStatus} prefix="Delivery" />
                  <span className="text-lg font-black text-white">{formatINR(o.totalPaise)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
