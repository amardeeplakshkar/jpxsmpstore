"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ImageUp, ShieldAlert, Smartphone, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "components/ui/button";
import { CopyButton } from "components/ui/copy-button";
import { Field, Input } from "components/ui/input";
import { StatusBadge } from "components/ui/status-badge";
import { api, ClientApiError } from "lib/client-api";
import type { ApiResponse } from "lib/api";
import { formatDateTime, formatINR } from "lib/utils";

type Shot = { id: string; status: string; rejectionReason: string | null; transactionRef: string | null; createdAt: string };

function useCountdown(expiresAt: string) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, label: `${m}:${s.toString().padStart(2, "0")}` };
}

export function PaymentPanel(props: {
  orderNumber: string;
  amountPaise: number;
  upiId: string;
  payeeName: string;
  upiUri: string | null;
  qrDataUrl: string | null;
  instructions: string;
  initialPaymentStatus: string;
  initialFulfillmentStatus: string;
  expiresAt: string;
  screenshotEnabled: boolean;
  maxScreenshotSizeMb: number;
  evidenceRequestNote: string | null;
  screenshots: Shot[];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(props.initialPaymentStatus);
  const [fulfillment, setFulfillment] = React.useState(props.initialFulfillmentStatus);
  const countdown = useCountdown(props.expiresAt);

  // Poll the server for status changes (payment detection is server-side only).
  React.useEffect(() => {
    if (["PAID", "REFUNDED", "REJECTED"].includes(status) && fulfillment !== "PENDING" && fulfillment !== "PROCESSING") return;
    const t = setInterval(async () => {
      try {
        const o = await api<{ paymentStatus: string; fulfillmentStatus: string }>(`/api/orders/${props.orderNumber}`);
        if (o.paymentStatus !== status || o.fulfillmentStatus !== fulfillment) {
          setStatus(o.paymentStatus);
          setFulfillment(o.fulfillmentStatus);
          router.refresh();
        }
      } catch {
        /* transient: try again next tick */
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [status, fulfillment, props.orderNumber, router]);

  if (fulfillment === "CANCELLED") {
    return <Notice icon={<ShieldAlert />} tone="danger" title="Order cancelled" body="This order was cancelled. If you already paid, contact support on Discord with your order number." />;
  }
  if (status === "PAID") {
    return (
      <Notice
        icon={<CheckCircle2 />}
        tone="success"
        title="Payment confirmed"
        body={
          fulfillment === "FULFILLED"
            ? "Your purchase has been delivered in-game. Enjoy!"
            : "Thanks! Your order is in the delivery queue. A staff member will deliver it in-game shortly."
        }
      />
    );
  }
  if (status === "REFUNDED") return <Notice icon={<CheckCircle2 />} tone="warning" title="Refunded" body="This order has been refunded." />;

  const expired = status === "EXPIRED" || (status === "PENDING" && countdown.ms === 0);

  return (
    <section className="space-y-6 p-6 sm:p-10" aria-labelledby="pay-heading">
      {props.evidenceRequestNote && (
        <Notice icon={<TriangleAlert />} tone="warning" title="Our team needs more information" body={props.evidenceRequestNote} />
      )}
      {status === "MATCHED" && <Notice icon={<Clock />} tone="info" title="Payment detected" body="We found a matching payment. A staff member will confirm it shortly." />}
      {status === "VERIFYING" && <Notice icon={<Clock />} tone="info" title="Verifying your payment" body="We received your payment proof. A staff member will review it soon." />}
      {status === "REJECTED" && (
        <Notice icon={<ShieldAlert />} tone="danger" title="Payment could not be verified" body="Please upload a clearer screenshot with the transaction reference, or contact support on Discord." />
      )}

      {expired ? (
        <Notice
          icon={<Clock />}
          tone="warning"
          title="Payment window expired"
          body="This payment request has expired. Don't pay for this order. If you already paid, upload your screenshot below so our team can check it."
        />
      ) : (
        status !== "MATCHED" &&
        props.qrDataUrl && (
          <div className="rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-surface p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="mx-auto shrink-0 rounded-xl bg-white p-3 shadow-[0_10px_25px_rgb(0_0_0/0.1)] md:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={props.qrDataUrl} alt={`UPI QR code to pay ${formatINR(props.amountPaise)} for order ${props.orderNumber}`} className="size-56" />
              </div>
              <div className="flex-1 space-y-4">
                <h2 id="pay-heading" className="text-xl font-bold">Scan and pay with any UPI app</h2>
                <div>
                  <p className="text-xs uppercase text-muted">Amount</p>
                  <p className="text-[42px] font-black leading-none tracking-tight text-foreground">{formatINR(props.amountPaise)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-elevated px-3 py-2">
                    <p className="text-[11px] uppercase text-muted">UPI ID ({props.payeeName})</p>
                    <p className="font-mono text-sm">{props.upiId}</p>
                  </div>
                  <CopyButton value={props.upiId} label="UPI ID" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-elevated px-3 py-2">
                    <p className="text-[11px] uppercase text-muted">Payment note / Order ID</p>
                    <p className="font-mono text-sm">{props.orderNumber}</p>
                  </div>
                  <CopyButton value={props.orderNumber} label="order ID" />
                </div>
                {props.upiUri && (
                  <Button asChild variant="secondary" className="md:hidden">
                    <a href={props.upiUri}>
                      <Smartphone /> Open UPI app
                    </a>
                  </Button>
                )}
                {status === "PENDING" && (
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Clock className="size-4" /> Expires in <strong className="font-mono text-foreground">{countdown.label}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-2 font-semibold">Payment instructions</h3>
        <p className="whitespace-pre-line text-sm text-muted">{props.instructions}</p>
        <p className="mt-3 text-xs text-muted">
          Scanning the QR code does not confirm payment. Your order is marked paid only after we verify the transaction.
        </p>
      </div>

      {props.screenshotEnabled && <ScreenshotUpload orderNumber={props.orderNumber} maxMb={props.maxScreenshotSizeMb} screenshots={props.screenshots} />}
    </section>
  );
}

function ScreenshotUpload({ orderNumber, maxMb, screenshots }: { orderNumber: string; maxMb: number; screenshots: Shot[] }) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [utr, setUtr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a screenshot first.");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("Only PNG, JPG, JPEG and WebP images are allowed.");
    if (file.size > maxMb * 1024 * 1024) return setError(`Maximum file size is ${maxMb} MB.`);
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (utr.trim()) fd.append("transactionRef", utr.trim());
      const res = await fetch(`/api/orders/${orderNumber}/screenshot`, { method: "POST", body: fd, credentials: "same-origin" });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!body.ok) throw new ClientApiError(body.error.code, body.error.message);
      toast.success("Screenshot uploaded. Our team will verify it.");
      setFile(null);
      setUtr("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <ImageUp className="size-4 text-secondary" /> Already paid? Upload proof
      </h3>
      <p className="mb-4 text-sm text-muted">If your payment isn&apos;t detected automatically within a few minutes, upload a screenshot of the successful UPI payment.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Payment screenshot" htmlFor="shot" hint={`PNG, JPG or WebP up to ${maxMb} MB`} error={error}>
          <Input id="shot" type="file" accept="image/png,image/jpeg,image/webp" className="py-2 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-white file:font-bold" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="UPI transaction ID / UTR (optional)" htmlFor="utr" hint="Usually a 12-digit number shown in your UPI app.">
          <Input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={35} inputMode="text" autoComplete="off" />
        </Field>
        <Button type="submit" loading={busy}>
          Upload screenshot
        </Button>
      </form>
      {screenshots.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-border pt-4">
          {screenshots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <a href={`/api/orders/${orderNumber}/screenshot/${s.id}`} target="_blank" className="text-secondary hover:underline">
                Screenshot · {formatDateTime(s.createdAt)}
              </a>
              <span className="flex items-center gap-2">
                {s.rejectionReason && <span className="text-xs font-semibold text-red-600">{s.rejectionReason}</span>}
                <StatusBadge status={s.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notice({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: "success" | "danger" | "warning" | "info" }) {
  const tones = {
    success: "border-success/40 bg-success/10 text-emerald-800",
    danger: "border-danger/40 bg-danger/10 text-red-700",
    warning: "border-warning/40 bg-warning/10 text-amber-800",
    info: "border-primary/40 bg-primary/10 text-purple-800",
  };
  return (
    <div role="status" className={`flex gap-3 rounded-xl border p-4 ${tones[tone]}`}>
      <span className="mt-0.5 [&_svg]:size-5">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 whitespace-pre-line text-sm text-foreground/80">{body}</p>
      </div>
    </div>
  );
}
