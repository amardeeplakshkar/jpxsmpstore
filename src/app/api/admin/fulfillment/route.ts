import { ok, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { fulfillmentQueue } from "lib/admin/queries";

export const GET = route(async (req) => {
  await requireAdminApi("fulfillment.manage");
  const status = new URL(req.url).searchParams.get("status") === "FULFILLED" ? "FULFILLED" : "OPEN";
  return ok(await fulfillmentQueue(status));
});
