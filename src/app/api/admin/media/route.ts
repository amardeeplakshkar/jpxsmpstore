import { db } from "db/client";
import { mediaAssets } from "db/schema";
import { clientIp, fail, ok, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { listMedia } from "lib/admin/queries";
import { rateLimit } from "lib/rate-limit";
import { putObject, readImageUpload } from "lib/storage";

export const GET = route(async () => {
  await requireAdminApi("media.manage");
  const rows = await listMedia();
  return ok(rows.map(({ storageKey: _k, ...m }) => m));
});

/** Uploads a PUBLIC image (product images, logos, banners). Validated by magic bytes, max 5 MB. */
export const POST = route(async (req) => {
  const admin = await requireAdminApi("media.manage");
  await rateLimit("media-upload", `${admin.id}:${clientIp(req)}`, 60, 600);
  const form = await req.formData();
  const upload = await readImageUpload(form.get("file"), 5 * 1024 * 1024);
  if ("error" in upload) return fail(422, "INVALID_FILE", upload.error ?? "Invalid file.");
  const stored = await putObject({ data: upload.data, contentType: upload.contentType, folder: "media", visibility: "public" });
  const [asset] = await db
    .insert(mediaAssets)
    .values({ url: stored.url!, storageKey: stored.key, filename: upload.filename, contentType: upload.contentType, sizeBytes: upload.data.length, uploadedBy: admin.id })
    .returning();
  await audit({ actor: admin, action: "media.upload", entityType: "media", entityId: asset.id, metadata: { filename: asset.filename }, req });
  return ok({ id: asset.id, url: asset.url, filename: asset.filename }, 201);
});
