import { AdminShell } from "components/admin/shell";
import { requireAdminPage } from "lib/auth/guards";
import { getSetting } from "lib/settings";
import { discordAvatarUrl } from "lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage("dashboard.view");
  const branding = await getSetting("branding");
  return (
    <AdminShell
      storeName={branding.storeName}
      admin={{ name: admin.globalName ?? admin.username, avatar: discordAvatarUrl(admin.discordId, admin.avatar, 64), role: admin.adminRole }}
    >
      {children}
    </AdminShell>
  );
}
