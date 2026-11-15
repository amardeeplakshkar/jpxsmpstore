import { ok, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { auditFiltersSchema, listAuditLogs } from "lib/admin/queries";

export const GET = route(async (req) => {
  await requireAdminApi("audit.view");
  return ok(await listAuditLogs(auditFiltersSchema.parse(Object.fromEntries(new URL(req.url).searchParams))));
});
