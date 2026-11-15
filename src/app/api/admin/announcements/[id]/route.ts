import { eq } from "drizzle-orm";
import { db } from "db/client";
import { announcements } from "db/schema";
import { fail, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { announcementSchema, toAnnouncementValues } from "app/api/admin/announcements/route";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("storefront.manage");
  const { id } = await params;
  const input = await parseJson(req, announcementSchema);
  const [a] = await db.update(announcements).set(toAnnouncementValues(input)).where(eq(announcements.id, id)).returning();
  if (!a) return fail(404, "NOT_FOUND", "Announcement not found.");
  await audit({ actor: admin, action: "announcement.update", entityType: "announcement", entityId: id, metadata: { title: a.title }, req });
  return ok(a);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdminApi("storefront.manage");
  const { id } = await params;
  const [a] = await db.update(announcements).set({ deletedAt: new Date(), isActive: false }).where(eq(announcements.id, id)).returning();
  if (!a) return fail(404, "NOT_FOUND", "Announcement not found.");
  await audit({ actor: admin, action: "announcement.delete", entityType: "announcement", entityId: id, req });
  return ok({ deleted: true });
});
