import { ok, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { listUsersAdmin, userFiltersSchema } from "lib/admin/queries";

export const GET = route(async (req) => {
  await requireAdminApi("users.view");
  return ok(await listUsersAdmin(userFiltersSchema.parse(Object.fromEntries(new URL(req.url).searchParams))));
});
