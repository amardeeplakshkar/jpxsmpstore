import { eq } from "drizzle-orm";
import { db } from "db/client";
import { mediaAssets } from "db/schema";
import { fail, ok, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { deleteObject } from "lib/storage";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdminApi("media.manage");
  const { id } = await params;
  const asset = await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
  if (!asset || asset.deletedAt) return fail(404, "NOT_FOUND", "Media not found.");
  await db.update(mediaAssets).set({ deletedAt: new Date() }).where(eq(mediaAssets.id, id));
  await deleteObject(asset.storageKey);
  await audit({ actor: admin, action: "media.delete", entityType: "media", entityId: id, metadata: { filename: asset.filename }, req });
  return ok({ deleted: true });
});
