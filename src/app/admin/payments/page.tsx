import Link from "next/link";
import { ActionButton } from "components/admin/action-button";
import { PageHeader } from "components/admin/page-header";
import { Pagination } from "components/admin/pagination";
import { ScreenshotReview } from "components/admin/screenshot-review";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { EmptyState } from "components/ui/empty-state";
import { Input, NativeSelect } from "components/ui/input";
import { StatusBadge } from "components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { listOrdersAwaitingVerification, listPaymentEmails, listPendingScreenshots, paymentFiltersSchema } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { hasPermission } from "lib/permissions";
import { getWorkerHeartbeat } from "lib/queue";
import { getPublicImap } from "lib/settings";
import { formatDateTime, formatINR } from "lib/utils";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const admin = await requireAdminPage("payments.view");
  const sp = await searchParams;
  const f = paymentFiltersSchema.parse(sp);
  const [emails, shots, awaiting, worker, imap] = await Promise.all([listPaymentEmails(f), listPendingScreenshots(), listOrdersAwaitingVerification(), getWorkerHeartbeat(), getPublicImap()]);
  const canVerify = hasPermission(admin.adminRole, "payments.verify");
  const workerOnline = worker && Date.now() - new Date(worker.at).getTime() < 120_000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Review screenshots, matched bank emails and unmatched transactions."
        actions={canVerify && imap.enabled ? <ActionButton url="/api/admin/payments/poll" method="POST" label="Check inbox now" successMessage="Inbox check queued" /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="IMAP verification" value={imap.enabled ? "Enabled" : "Not configured"} tone={imap.enabled ? "ok" : "warn"} />
        <Info label="Worker" value={workerOnline ? `Online · last poll ${worker?.lastPollAt ? formatDateTime(worker.lastPollAt) : "never"}` : "Offline"} tone={workerOnline ? "ok" : "warn"} />
        <Info label="Last poll result" value={worker?.lastError ? `Error: ${worker.lastError}` : (worker?.lastPollResult ?? "-")} tone={worker?.lastError ? "warn" : "ok"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Awaiting verification ({awaiting.length})</CardTitle></CardHeader>
        <CardContent>
          {awaiting.length === 0 ? <p className="text-sm text-muted">Nothing to verify right now.</p> : (
            <ul className="divide-y divide-border">
              {awaiting.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-secondary hover:underline">{o.orderNumber}</Link>
                  <span>{o.user.username}</span>
                  <span className="font-semibold">{formatINR(o.totalPaise)}</span>
                  <span className="font-mono text-xs">{o.payment?.transactionRef ?? "no ref"}</span>
                  <StatusBadge status={o.paymentStatus} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pending screenshots ({shots.length})</CardTitle></CardHeader>
        <CardContent>
          {shots.length === 0 ? <p className="text-sm text-muted">No screenshots waiting for review.</p> : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shots.map((s) => (
                <div key={s.id} className="space-y-1">
                  <Link href={`/admin/orders/${s.order.id}`} className="text-xs text-secondary hover:underline">{s.order.orderNumber} · {formatINR(s.order.totalPaise)}</Link>
                  <ScreenshotReview canReview={canVerify} shot={{ id: s.id, status: s.status, transactionRef: s.transactionRef, rejectionReason: s.rejectionReason, createdAt: s.createdAt.toISOString(), imageUrl: `/api/orders/${s.order.orderNumber}/screenshot/${s.id}` }} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Bank email matching results</h2>
        <form className="mb-3 flex flex-wrap gap-2" role="search">
          <NativeSelect name="status" defaultValue={f.status ?? ""} className="w-48" aria-label="Status">
            <option value="">All statuses</option>
            {["MATCHED", "UNMATCHED", "AMBIGUOUS", "DUPLICATE", "UNTRUSTED", "PARSE_FAILED", "IGNORED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
          <Input name="q" placeholder="UTR, sender or subject" defaultValue={f.q} className="w-64" aria-label="Search" />
          <Button type="submit">Filter</Button>
        </form>
        {emails.rows.length === 0 ? <EmptyState title="No payment emails yet" description="Processed bank notifications will appear here." /> : (
          <Table>
            <THead><tr><TH>Received</TH><TH>From</TH><TH>Amount</TH><TH>Ref</TH><TH>Status</TH><TH>Reason</TH><TH>Order</TH><TH /></tr></THead>
            <TBody>
              {emails.rows.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap text-xs">{formatDateTime(e.receivedAt)}</TD>
                  <TD className="max-w-44 truncate text-xs" title={e.subject}>{e.fromAddress}<span className="block text-muted">{e.parserName ?? "-"}</span></TD>
                  <TD>{e.amountPaise !== null ? formatINR(e.amountPaise) : "-"}</TD>
                  <TD className="font-mono text-xs">{e.transactionRef ?? "-"}</TD>
                  <TD><StatusBadge status={e.status} /></TD>
                  <TD className="max-w-64 text-xs text-muted">{e.matchReason}</TD>
                  <TD className="text-xs">{e.order ? <Link className="text-secondary hover:underline" href={`/admin/orders/${e.order.id}`}>{e.order.orderNumber}</Link> : (e.referencedOrderNumber ?? "-")}</TD>
                  <TD>
                    {canVerify && !["MATCHED", "IGNORED", "UNTRUSTED"].includes(e.status) && (
                      <div className="flex gap-1">
                        <ActionButton url={`/api/admin/payments/emails/${e.id}`} body={{ action: "link" }} label="Link" fields={[{ name: "orderNumber", label: "Order number", required: true, placeholder: "JPX-20261114-A8K92", defaultValue: e.referencedOrderNumber ?? "" }]} dialogDescription="Linking confirms payment for that order. The amount must match exactly." successMessage="Linked and confirmed" />
                        <ActionButton url={`/api/admin/payments/emails/${e.id}`} body={{ action: "ignore" }} label="Ignore" variant="ghost" fields={[{ name: "reason", label: "Reason", required: true }]} />
                      </div>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination page={emails.page} pageCount={emails.pageCount} total={emails.total} basePath="/admin/payments" params={sp} />
      </section>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "ok" ? "border-border bg-surface" : "border-warning/40 bg-warning/10"}`}>
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-medium" title={value}>{value}</p>
    </div>
  );
}
