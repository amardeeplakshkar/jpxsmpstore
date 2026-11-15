import { PageHeader } from "components/admin/page-header";
import { MediaLibrary } from "components/admin/media-library";
import { listMedia } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";

export default async function MediaPage() {
  await requireAdminPage("media.manage");
  const items = await listMedia();
  return (
    <div>
      <PageHeader title="Media library" description="Public images for products, logos and banners. Payment screenshots are stored privately and never appear here." />
      <MediaLibrary items={items.map((m) => ({ id: m.id, url: m.url, filename: m.filename, sizeBytes: m.sizeBytes, createdAt: m.createdAt.toISOString() }))} />
    </div>
  );
}
