"use client";

import { ActionButton } from "components/admin/action-button";
import { StatusBadge } from "components/ui/status-badge";
import { formatDateTime } from "lib/utils";

export function ScreenshotReview({ shot, canReview }: { shot: { id: string; status: string; transactionRef: string | null; rejectionReason: string | null; createdAt: string; imageUrl: string }; canReview: boolean }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-elevated/50 p-3">
      <a href={shot.imageUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.imageUrl} alt="Payment screenshot" className="max-h-80 w-full object-contain" loading="lazy" />
      </a>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{formatDateTime(shot.createdAt)}</span>
        <StatusBadge status={shot.status} />
      </div>
      <p className="text-xs">UTR entered by customer: <span className="font-mono">{shot.transactionRef ?? "none"}</span></p>
      {shot.rejectionReason && <p className="text-xs text-rose-300">Rejected: {shot.rejectionReason}</p>}
      {canReview && shot.status === "PENDING" && (
        <div className="flex gap-2">
          <ActionButton url={`/api/admin/payments/screenshots/${shot.id}`} body={{ decision: "APPROVE" }} label="Approve" variant="default" successMessage="Screenshot approved, payment confirmed"
            fields={[{ name: "transactionRef", label: "Transaction reference / UTR", defaultValue: shot.transactionRef ?? "", hint: "Verify this against your bank statement before approving." }]}
            dialogDescription="Approving confirms the payment and moves the order to fulfillment." />
          <ActionButton url={`/api/admin/payments/screenshots/${shot.id}`} body={{ decision: "REJECT" }} label="Reject" variant="destructive" fields={[{ name: "reason", label: "Rejection reason (shown to the customer)", type: "textarea", required: true }]} />
        </div>
      )}
    </div>
  );
}
