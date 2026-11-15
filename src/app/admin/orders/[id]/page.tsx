import { notFound } from "next/navigation";
import { Ban, CheckCircle2, FileQuestion, PackageCheck, Play, RotateCcw, StickyNote, XCircle } from "lucide-react";
import { ActionButton } from "components/admin/action-button";
import { PageHeader } from "components/admin/page-header";
import { ScreenshotReview } from "components/admin/screenshot-review";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { CopyButton } from "components/ui/copy-button";
import { StatusBadge } from "components/ui/status-badge";
import { getOrderAdmin } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { hasPermission } from "lib/permissions";
import { discordAvatarUrl, formatDateTime, formatINR } from "lib/utils";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("orders.view");
  const { id } = await params;
  const o = await getOrderAdmin(id);
  if (!o) notFound();
  const url = `/api/admin/orders/${o.id}`;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(admin.adminRole, p);
  const openPayment = ["PENDING", "VERIFYING", "MATCHED", "REJECTED", "EXPIRED"].includes(o.paymentStatus) && o.fulfillmentStatus !== "CANCELLED";
  const paid = o.paymentStatus === "PAID";

  return (
    <div className="space-y-6">
      <PageHeader
        title={o.orderNumber}
        description={`Created ${formatDateTime(o.createdAt)}`}
        actions={
          <>
            <StatusBadge status={o.paymentStatus} prefix="Payment" />
            <StatusBadge status={o.fulfillmentStatus} prefix="Fulfillment" />
          </>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        {openPayment && can("payments.verify") && (
          <>
            <ActionButton url={url} body={{ action: "confirm_payment" }} label="Confirm payment" variant="default" icon={<CheckCircle2 />} successMessage="Payment confirmed"
              fields={[{ name: "transactionRef", label: "Transaction reference / UTR", hint: o.payment?.transactionRef ? `Detected: ${o.payment.transactionRef}` : "Optional but recommended", defaultValue: o.payment?.transactionRef ?? "" }, { name: "note", label: "Note", type: "textarea" }]}
              dialogDescription={`Confirm that ${formatINR(o.totalPaise)} was received. This moves the order to the fulfillment queue.`} />
            <ActionButton url={url} body={{ action: "reject_payment" }} label="Reject payment" variant="destructive" icon={<XCircle />} fields={[{ name: "reason", label: "Reason (shown to staff)", type: "textarea", required: true }]} />
            <ActionButton url={url} body={{ action: "request_evidence" }} label="Request evidence" icon={<FileQuestion />} fields={[{ name: "message", label: "Message shown to the customer", type: "textarea", required: true, placeholder: "Please upload a screenshot showing the UTR number." }]} />
          </>
        )}
        {paid && can("fulfillment.manage") && o.fulfillmentStatus !== "FULFILLED" && o.fulfillmentStatus !== "CANCELLED" && (
          <>
            {o.fulfillmentStatus !== "PROCESSING" && <ActionButton url={url} body={{ action: "start_fulfillment" }} label="Start fulfillment" icon={<Play />} variant="secondary" />}
            <ActionButton url={url} body={{ action: "mark_fulfilled" }} label="Mark fulfilled" variant="gold" icon={<PackageCheck />}
              fields={[{ name: "deliveryNotes", label: "Delivery notes", type: "textarea" }, { name: "proofUrl", label: "Delivery proof URL (optional)", type: "url" }]}
              dialogDescription={`Confirm you delivered the product to ${o.minecraftUsername} (${o.gameEdition}).`} />
            <ActionButton url={url} body={{ action: "mark_failed" }} label="Mark failed" variant="outline" fields={[{ name: "reason", label: "Failure reason", type: "textarea", required: true }]} />
          </>
        )}
        {can("orders.cancel") && !["FULFILLED", "CANCELLED"].includes(o.fulfillmentStatus) && (
          <ActionButton url={url} body={{ action: "cancel" }} label="Cancel order" variant="destructive" icon={<Ban />} fields={[{ name: "reason", label: "Cancellation reason", type: "textarea", required: true }]} />
        )}
        {paid && can("payments.refund") && (
          <ActionButton url={url} body={{ action: "refund" }} label="Mark refunded" icon={<RotateCcw />} fields={[{ name: "note", label: "Refund note (refund is sent outside the store)", type: "textarea", required: true }]} />
        )}
        {can("orders.note") && <ActionButton url={url} body={{ action: "add_note" }} label="Add internal note" icon={<StickyNote />} fields={[{ name: "note", label: "Internal note", type: "textarea", required: true }]} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={discordAvatarUrl(o.user.discordId, o.user.avatar, 64)} alt="" className="size-14 rounded-lg" />
            <div className="text-sm">
              <p className="font-semibold">{o.user.globalName ?? o.user.username} <span className="text-muted">@{o.user.username}</span></p>
              <p className="flex items-center gap-2 font-mono text-xs text-muted">{o.user.discordId} <CopyButton value={o.user.discordId} size="icon" variant="ghost" label="Discord ID" /></p>
              <StatusBadge status={o.user.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Purchase</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {o.items.map((i) => (
              <div key={i.id} className="flex justify-between"><span>{i.quantity}x {i.productSnapshot.name} <span className="text-xs text-muted">({i.productSnapshot.type})</span></span><span>{formatINR(i.lineTotalPaise)}</span></div>
            ))}
            <Row k="Regular price" v={formatINR(o.subtotalPaise)} />
            <Row k="Discount" v={formatINR(o.discountPaise)} />
            <Row k="Total" v={formatINR(o.totalPaise)} bold />
            <Row k="Type" v={o.purchaseType === "GIFT" ? "Gift" : "Self"} />
            <div className="flex items-center justify-between"><span className="text-muted">Minecraft username</span><span className="flex items-center gap-1 font-mono">{o.minecraftUsername}<CopyButton value={o.minecraftUsername} size="icon" variant="ghost" label="username" /></span></div>
            <Row k="Edition" v={o.gameEdition} />
            {o.giftNote && <Row k="Gift note" v={o.giftNote} />}
            <details className="pt-2">
              <summary className="cursor-pointer text-xs text-secondary">Product snapshot</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-elevated p-3 text-xs">{JSON.stringify(o.items.map((i) => i.productSnapshot), null, 2)}</pre>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Amount" v={formatINR(o.payment?.amountPaise ?? o.totalPaise)} bold />
            <Row k="UPI ID (at order time)" v={o.payment?.upiId ?? "-"} />
            <Row k="Method" v={o.payment?.method ?? "-"} />
            <Row k="Transaction ref" v={o.payment?.transactionRef ?? "-"} mono />
            <Row k="Transaction time" v={formatDateTime(o.payment?.transactionAt)} />
            <Row k="Verified at" v={formatDateTime(o.payment?.verifiedAt)} />
            <Row k="Expires" v={formatDateTime(o.paymentExpiresAt)} />
            {o.payment?.rejectionReason && <Row k="Rejection reason" v={o.payment.rejectionReason} />}
            {o.evidenceRequestedAt && <Row k="Evidence requested" v={o.evidenceRequestNote ?? ""} />}
            <div className="border-t border-border pt-3">
              <p className="mb-2 font-medium">Email verification</p>
              {o.emails.length === 0 ? <p className="text-xs text-muted">No bank emails linked to this order.</p> : o.emails.map((e) => (
                <div key={e.id} className="mb-2 rounded-lg bg-elevated p-2 text-xs">
                  <div className="flex justify-between"><span>{e.fromAddress}</span><StatusBadge status={e.status} /></div>
                  <p className="text-muted">{e.parserName} · {e.amountPaise !== null ? formatINR(e.amountPaise) : "-"} · ref {e.transactionRef ?? "-"} · {formatDateTime(e.receivedAt)}</p>
                  <p className="text-muted">{e.matchReason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fulfillment</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Status" v={o.fulfillmentStatus} />
            <Row k="Product delivered" v={o.fulfillment?.productDelivered ?? "-"} />
            <Row k="Started" v={formatDateTime(o.fulfillment?.startedAt)} />
            <Row k="Fulfilled by (Discord ID)" v={o.fulfillment?.fulfilledByDiscordId ?? "-"} mono />
            <Row k="Fulfilled at" v={formatDateTime(o.fulfillment?.fulfilledAt)} />
            {o.fulfillment?.deliveryNotes && <Row k="Delivery notes" v={o.fulfillment.deliveryNotes} />}
            {o.fulfillment?.proofUrl && <div className="flex justify-between"><span className="text-muted">Proof</span><a href={o.fulfillment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Open</a></div>}
            {o.fulfillment?.failureReason && <Row k="Failure reason" v={o.fulfillment.failureReason} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment screenshots</CardTitle></CardHeader>
        <CardContent>
          {o.screenshots.length === 0 ? <p className="text-sm text-muted">No screenshots uploaded.</p> : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {o.screenshots.map((s) => (
                <ScreenshotReview key={s.id} canReview={can("payments.verify")} shot={{ id: s.id, status: s.status, transactionRef: s.transactionRef, rejectionReason: s.rejectionReason, createdAt: s.createdAt.toISOString(), imageUrl: `/api/orders/${o.orderNumber}/screenshot/${s.id}` }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timeline and notes</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l border-border pl-4">
            {o.history.map((h) => (
              <li key={h.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={h.kind === "NOTE" ? "font-semibold text-accent" : "font-semibold"}>{h.kind === "NOTE" ? "Internal note" : h.kind}</span>
                  {h.fromStatus && h.toStatus && <span className="text-xs text-muted">{h.fromStatus} → {h.toStatus}</span>}
                  {!h.fromStatus && h.toStatus && <span className="text-xs text-muted">{h.toStatus}</span>}
                  <span className="text-xs text-muted">· {h.actorType}{h.actor ? ` (${h.actor.username})` : ""} · {formatDateTime(h.createdAt)}</span>
                </p>
                {h.note && <p className="mt-0.5 whitespace-pre-line text-muted">{h.note}</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v, bold, mono }: { k: string; v: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className={`${bold ? "font-bold" : ""} ${mono ? "font-mono text-xs" : ""} text-right`}>{v}</span>
    </div>
  );
}
