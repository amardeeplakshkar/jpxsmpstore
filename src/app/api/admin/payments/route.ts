import { ok, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { listOrdersAwaitingVerification, listPaymentEmails, listPendingScreenshots, paymentFiltersSchema } from "lib/admin/queries";
import { getWorkerHeartbeat } from "lib/queue";

export const GET = route(async (req) => {
  await requireAdminApi("payments.view");
  const f = paymentFiltersSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const [emails, screenshots, awaiting, worker] = await Promise.all([listPaymentEmails(f), listPendingScreenshots(), listOrdersAwaitingVerification(), getWorkerHeartbeat()]);
  return ok({ emails, screenshots: screenshots.map(({ storageKey: _k, ...s }) => s), awaiting, worker });
});
