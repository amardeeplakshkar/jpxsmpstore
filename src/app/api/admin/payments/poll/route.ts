import { ok, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { paymentsQueue } from "lib/queue";

/** Queues an immediate IMAP poll for the worker. */
export const POST = route(async (req) => {
  const admin = await requireAdminApi("payments.verify");
  await paymentsQueue().add("imap-poll-now", {}, { removeOnComplete: true, removeOnFail: 50, attempts: 1 });
  await audit({ actor: admin, action: "payments.poll_now", entityType: "worker", req });
  return ok({ queued: true });
});
