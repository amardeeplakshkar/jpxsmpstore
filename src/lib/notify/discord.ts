import { eq } from "drizzle-orm";
import { db } from "db/client";
import { orders, paymentScreenshots } from "db/schema";
import { getObject } from "lib/storage";

/**
 * Posts order / payment events to a Discord channel webhook (DISCORD_ORDERS_WEBHOOK_URL).
 * Screenshot uploads include the payment screenshot as an attachment.
 * Never throws: a Discord outage must not affect checkout or admin actions.
 */
export type OrderEvent =
  | "created"
  | "screenshot"
  | "matched"
  | "paid"
  | "rejected"
  | "screenshot_rejected"
  | "evidence_requested"
  | "fulfilled"
  | "failed"
  | "cancelled"
  | "refunded";

const EVENTS: Record<OrderEvent, { title: string; color: number }> = {
  created: { title: "New order placed", color: 0x5865f2 },
  screenshot: { title: "Payment screenshot submitted", color: 0xf5a524 },
  matched: { title: "Bank email matched - needs confirmation", color: 0x22b8cf },
  paid: { title: "Payment confirmed", color: 0x22c55e },
  rejected: { title: "Payment rejected", color: 0xef4444 },
  screenshot_rejected: { title: "Screenshot rejected", color: 0xef4444 },
  evidence_requested: { title: "More payment evidence requested", color: 0xf5a524 },
  fulfilled: { title: "Order delivered", color: 0x10b981 },
  failed: { title: "Fulfillment failed", color: 0xef4444 },
  cancelled: { title: "Order cancelled", color: 0x6b7280 },
  refunded: { title: "Order refunded", color: 0x6b7280 },
};

const WEBHOOK_RE = /^https:\/\/(?:ptb\.|canary\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function webhookUrl(): string | null {
  const url = process.env.DISCORD_ORDERS_WEBHOOK_URL?.trim();
  return url && WEBHOOK_RE.test(url) ? url : null;
}

const inr = (paise: number) => `\u20b9${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}\u2026` : s);
/** Stops customer-controlled text from pinging @everyone or breaking formatting. */
const safe = (s: string | null | undefined, n = 1000) => clip(String(s ?? "").replace(/@/g, "@\u200b").replace(/[`*_~|>]/g, "\\$&"), n);
const ts = (d: Date | string | null | undefined) => (d ? `<t:${Math.floor(new Date(d).getTime() / 1000)}:f>` : "-");
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function notifyOrder(orderId: string, event: OrderEvent, opts: { screenshotId?: string; note?: string | null; by?: string | null } = {}) {
  const url = webhookUrl();
  if (!url) return;
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true, user: true, payment: true },
    });
    if (!order) return;
    const meta = EVENTS[event];
    const items = order.items.map((i) => `${i.quantity}x ${safe(i.productSnapshot.name, 80)} - ${inr(i.lineTotalPaise)}`).join("\n") || "-";
    const shot = opts.screenshotId ? await db.query.paymentScreenshots.findFirst({ where: eq(paymentScreenshots.id, opts.screenshotId) }) : null;
    const utr = shot?.transactionRef ?? order.payment?.transactionRef ?? null;
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

    const fields = [
      { name: "Order", value: `\`${order.orderNumber}\``, inline: true },
      { name: "Total", value: inr(order.totalPaise) + (order.discountPaise > 0 ? ` (saved ${inr(order.discountPaise)})` : ""), inline: true },
      { name: "Status", value: `Payment: **${order.paymentStatus}**\nDelivery: **${order.fulfillmentStatus}**`, inline: true },
      { name: "Minecraft player", value: `${safe(order.minecraftUsername, 40)} (${order.gameEdition})`, inline: true },
      { name: "Discord", value: order.user ? `<@${order.user.discordId}> (${safe(order.user.globalName ?? order.user.username, 60)})` : "-", inline: true },
      { name: "Type", value: order.purchaseType === "GIFT" ? "Gift" : "Self", inline: true },
      { name: "Items", value: clip(items, 1024), inline: false },
    ];
    if (order.purchaseType === "GIFT" && order.giftNote) fields.push({ name: "Gift note", value: safe(order.giftNote, 300), inline: false });
    if (utr) fields.push({ name: "UTR / transaction ref", value: `\`${safe(utr, 40)}\``, inline: true });
    if (order.payment?.method) fields.push({ name: "Method", value: order.payment.method.replace(/_/g, " "), inline: true });
    fields.push({ name: "Placed", value: ts(order.createdAt), inline: true });
    if (opts.note) fields.push({ name: "Note", value: safe(opts.note, 500), inline: false });
    if (opts.by) fields.push({ name: "By", value: safe(opts.by, 60), inline: true });

    const embed: Record<string, unknown> = {
      title: `${meta.title} - ${order.orderNumber}`,
      url: base ? `${base}/admin/orders/${order.id}` : undefined,
      color: meta.color,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: "JPXSMP Store" },
    };

    const form = new FormData();
    if (shot) {
      try {
        const bytes = await getObject(shot.storageKey);
        const name = `payment-${order.orderNumber}.${EXT[shot.contentType] ?? "png"}`;
        form.append("files[0]", new Blob([new Uint8Array(bytes)], { type: shot.contentType }), name);
        embed.image = { url: `attachment://${name}` };
      } catch (err) {
        console.warn("[discord] could not attach screenshot:", (err as Error).message);
        fields.push({ name: "Screenshot", value: "Could not attach - view it in the admin panel.", inline: false });
      }
    }
    form.append("payload_json", JSON.stringify({ username: "Store Orders", embeds: [embed], allowed_mentions: { parse: [] } }));

    const res = await fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) console.warn(`[discord] webhook responded ${res.status}: ${clip(await res.text().catch(() => ""), 200)}`);
  } catch (err) {
    console.warn("[discord] order notification failed:", (err as Error).message);
  }
}
