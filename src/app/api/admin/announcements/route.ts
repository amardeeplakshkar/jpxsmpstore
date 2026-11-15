import { asc, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import { announcements } from "db/schema";
import { ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";

const date = z.union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)]).nullable().default(null);
export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(160),
  body: z.string().max(2000).default(""),
  type: z.enum(["INFO", "SALE", "UPDATE", "WARNING"]).default("INFO"),
  linkUrl: z.string().url().max(500).nullable().default(null).or(z.literal("").transform(() => null)),
  isActive: z.boolean().default(true),
  isPinned: z.boolean().default(false),
  startsAt: date,
  endsAt: date,
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
});

export function toAnnouncementValues(v: z.infer<typeof announcementSchema>) {
  return { ...v, startsAt: v.startsAt ? new Date(v.startsAt) : null, endsAt: v.endsAt ? new Date(v.endsAt) : null };
}

export const GET = route(async () => {
  await requireAdminApi("storefront.manage");
  return ok(await db.select().from(announcements).where(isNull(announcements.deletedAt)).orderBy(desc(announcements.isPinned), asc(announcements.sortOrder)));
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi("storefront.manage");
  const input = await parseJson(req, announcementSchema);
  const [a] = await db.insert(announcements).values(toAnnouncementValues(input)).returning();
  await audit({ actor: admin, action: "announcement.create", entityType: "announcement", entityId: a.id, metadata: { title: a.title }, req });
  return ok(a, 201);
});
