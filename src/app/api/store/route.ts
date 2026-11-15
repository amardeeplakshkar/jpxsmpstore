import { ok, route } from "lib/api";
import { listActiveAnnouncements } from "lib/products/queries";
import { getServerStatus } from "lib/server-status";
import { getSetting, getStorefrontSettings } from "lib/settings";

export const GET = route(async () => {
  const [settings, announcements, status, payment] = await Promise.all([
    getStorefrontSettings(),
    listActiveAnnouncements(),
    getServerStatus(),
    getSetting("payment"),
  ]);
  return ok({
    ...settings,
    announcements: announcements.map((a) => ({ id: a.id, title: a.title, body: a.body, type: a.type, linkUrl: a.linkUrl, isPinned: a.isPinned })),
    serverStatus: status,
    paymentsEnabled: Boolean(payment.upiId && payment.qrEnabled),
  });
});
