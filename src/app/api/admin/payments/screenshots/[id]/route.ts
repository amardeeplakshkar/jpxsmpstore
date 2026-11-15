import { z } from "zod";
import { ok, parseJson, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { reviewScreenshot } from "lib/admin/order-actions";

const schema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE"), transactionRef: z.string().trim().regex(/^[A-Za-z0-9]{8,35}$/).optional().nullable().or(z.literal("")) }),
  z.object({ decision: z.literal("REJECT"), reason: z.string().trim().min(3).max(500) }),
]);

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdminApi("payments.verify");
  const { id } = await params;
  const input = await parseJson(req, schema);
  const order = await reviewScreenshot(admin, id, input.decision === "APPROVE" ? { decision: "APPROVE", transactionRef: input.transactionRef || null } : input, req);
  return ok({ orderId: order.id, paymentStatus: order.paymentStatus });
});
