import { and, count, eq } from "drizzle-orm";
import { db } from "db/client";
import { orders, paymentScreenshots } from "db/schema";
import { ApiError, clientIp, fail, ok, route } from "lib/api";
import { audit } from "lib/audit";
import { requireUserApi } from "lib/auth/guards";
import { addHistory, lockOrder, setPaymentStatus } from "lib/payments/transitions";
import { rateLimit } from "lib/rate-limit";
import { getSetting } from "lib/settings";
import { putObject, readImageUpload } from "lib/storage";

const UTR_RE = /^[A-Za-z0-9]{8,35}$/;

/** Uploads a payment screenshot to PRIVATE storage. Never confirms payment; it only moves the order to VERIFYING. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUserApi();
  const { id } = await params;
  await rateLimit("screenshot", `${user.id}:${clientIp(req)}`, 10, 600);
  const cfg = await getSetting("payment");
  if (!cfg.screenshotEnabled) return fail(403, "SCREENSHOTS_DISABLED", "Screenshot uploads are disabled.");

  const order = await db.query.orders.findFirst({ where: and(eq(orders.orderNumber, id.toUpperCase()), eq(orders.userId, user.id)) });
  if (!order) return fail(404, "ORDER_NOT_FOUND", "Order not found.");
  if (!["PENDING", "VERIFYING", "EXPIRED", "REJECTED"].includes(order.paymentStatus) || order.fulfillmentStatus === "CANCELLED") {
    return fail(409, "NOT_ACCEPTING_EVIDENCE", "This order is not accepting payment evidence.");
  }
  const [{ n }] = await db.select({ n: count() }).from(paymentScreenshots).where(eq(paymentScreenshots.orderId, order.id));
  if (n >= cfg.maxScreenshotsPerOrder) {
    return fail(409, "SCREENSHOT_LIMIT", `You can upload up to ${cfg.maxScreenshotsPerOrder} screenshots per order. Contact support on Discord.`);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "INVALID_FORM", "Upload must be multipart/form-data.");
  }
  const upload = await readImageUpload(form.get("file"), cfg.maxScreenshotSizeMb * 1024 * 1024);
  if ("error" in upload) return fail(422, "INVALID_FILE", upload.error ?? "Invalid file.");
  const utrRaw = String(form.get("transactionRef") ?? "").trim();
  if (utrRaw && !UTR_RE.test(utrRaw)) return fail(422, "INVALID_UTR", "Transaction reference should be 8-35 letters or numbers.");

  const stored = await putObject({ data: upload.data, contentType: upload.contentType, folder: "screenshots", visibility: "private" });

  const shot = await db.transaction(async (tx) => {
    const locked = await lockOrder(tx, order.id);
    const [s] = await tx
      .insert(paymentScreenshots)
      .values({
        orderId: order.id,
        uploadedBy: user.id,
        storageKey: stored.key,
        contentType: upload.contentType,
        sizeBytes: upload.data.length,
        transactionRef: utrRaw ? utrRaw.toUpperCase() : null,
      })
      .returning();
    if (locked.paymentStatus !== "VERIFYING") {
      await setPaymentStatus(tx, locked, "VERIFYING", { type: "USER", userId: user.id }, "Customer uploaded a payment screenshot");
    } else {
      await addHistory(tx, order.id, { kind: "EVENT", note: "Customer uploaded another payment screenshot", actor: { type: "USER", userId: user.id } });
    }
    if (locked.evidenceRequestedAt) {
      await tx.update(orders).set({ evidenceRequestedAt: null }).where(eq(orders.id, order.id));
    }
    await audit({ actor: { id: user.id, discordId: user.discordId }, actorType: "USER", action: "payment.screenshot_upload", entityType: "order", entityId: order.id, metadata: { screenshotId: s.id }, req }, tx);
    return s;
  });
  return ok({ id: shot.id, status: shot.status, createdAt: shot.createdAt }, 201);
});
