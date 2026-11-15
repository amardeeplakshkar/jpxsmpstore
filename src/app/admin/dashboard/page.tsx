import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, IndianRupee, Package, Truck, Users, Wallet } from "lucide-react";
import { PageHeader } from "components/admin/page-header";
import { RevenueChart } from "components/admin/revenue-chart";
import { StatCard } from "components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { StatusBadge } from "components/ui/status-badge";
import { getDashboard } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { getWorkerHeartbeat } from "lib/queue";
import { getPublicImap } from "lib/settings";
import { formatDateTime, formatINR } from "lib/utils";

export default async function DashboardPage() {
  await requireAdminPage("dashboard.view");
  const [d, worker, imap] = await Promise.all([getDashboard(), getWorkerHeartbeat(), getPublicImap()]);
  const workerStale = !worker || Date.now() - new Date(worker.at).getTime() > 120_000;
  const s = d.stats;
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Revenue counts confirmed (PAID) payments only." />

      {(d.alerts.needsReview > 0 || d.alerts.emailIssues > 0 || (imap.enabled && workerStale) || worker?.lastError) && (
        <div className="space-y-2">
          {d.alerts.needsReview > 0 && (
            <Alert href="/admin/payments">{d.alerts.needsReview} payment(s) need verification (screenshot uploaded or email matched).</Alert>
          )}
          {d.alerts.emailIssues > 0 && <Alert href="/admin/payments?status=UNMATCHED">{d.alerts.emailIssues} payment email(s) are unmatched, ambiguous or duplicate.</Alert>}
          {imap.enabled && workerStale && <Alert href="/admin/settings">The payment worker has not reported in the last 2 minutes. Check the worker container.</Alert>}
          {worker?.lastError && <Alert href="/admin/settings">Last IMAP poll failed: {worker.lastError}</Alert>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatINR(s.totalRevenuePaise)} icon={IndianRupee} tone="accent" />
        <StatCard label="Today's revenue" value={formatINR(s.todayRevenuePaise)} icon={Wallet} tone="accent" />
        <StatCard label="Total orders" value={String(s.totalOrders)} icon={ClipboardList} />
        <StatCard label="Pending payments" value={String(s.pendingPayments)} icon={Clock} tone="warning" />
        <StatCard label="Verified payments" value={String(s.verifiedPayments)} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending fulfillment" value={String(s.pendingFulfillment)} icon={Truck} tone="secondary" />
        <StatCard label="Total users" value={String(s.totalUsers)} icon={Users} />
        <StatCard label="Active products" value={String(s.activeProducts)} icon={Package} tone="secondary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={d.chart} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentOrders.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-secondary">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-secondary">{o.orderNumber}</p>
                        <p className="truncate">
                          {o.items[0]?.productSnapshot.name} · {o.user.username}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={o.paymentStatus} />
                        <span className="font-semibold">{formatINR(o.totalPaise)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent payment activity</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentEmails.length === 0 ? (
              <p className="text-sm text-muted">No payment emails processed yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.recentEmails.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{e.amountPaise !== null ? formatINR(e.amountPaise) : "No amount"} · {e.transactionRef ?? "no ref"}</p>
                      <p className="truncate text-xs text-muted">
                        {e.fromAddress} · {formatDateTime(e.receivedAt)}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top-selling products</CardTitle>
        </CardHeader>
        <CardContent>
          {d.topProducts.length === 0 ? (
            <p className="text-sm text-muted">No paid orders yet.</p>
          ) : (
            <ol className="space-y-2">
              {d.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mr-2 text-muted">#{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="text-muted">
                    {p.units} sold · <span className="font-semibold text-accent">{formatINR(p.revenue)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Alert({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-amber-200 hover:bg-warning/15">
      <AlertTriangle className="size-4 shrink-0" /> {children}
    </Link>
  );
}
