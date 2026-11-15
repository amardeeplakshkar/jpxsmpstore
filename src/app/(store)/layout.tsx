import { Navbar } from "components/store/navbar";
import { Footer } from "components/store/footer";
import { getCurrentUser } from "lib/auth/session";
import { getStorefrontSettings } from "lib/settings";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getStorefrontSettings(), getCurrentUser()]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Navbar storeName={settings.branding.storeName} logoUrl={settings.branding.logoUrl} user={user} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} />
    </div>
  );
}
