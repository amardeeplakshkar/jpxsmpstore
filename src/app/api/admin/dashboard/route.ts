import { ok, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { getDashboard } from "lib/admin/queries";
import { getWorkerHeartbeat } from "lib/queue";

export const GET = route(async () => {
  await requireAdminApi("dashboard.view");
  const [data, worker] = await Promise.all([getDashboard(), getWorkerHeartbeat()]);
  return ok({ ...data, worker });
});
