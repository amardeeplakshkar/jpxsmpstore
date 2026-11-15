import { ok, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { listOrdersAdmin, orderFiltersSchema } from "lib/admin/queries";

export const GET = route(async (req) => {
  await requireAdminApi("orders.view");
  const filters = orderFiltersSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await listOrdersAdmin(filters));
});
