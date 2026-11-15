import { Navbar } from "components/store/navbar";
import { Footer } from "components/store/footer";
import { getCurrentUser } from "lib/auth/session";
import { getStorefrontSettings } from "lib/settings";
import { listGameModes } from "lib/products/queries";
import { CartProvider } from "components/cart/cart-provider";
import { CartDrawer } from "components/cart/cart-drawer";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, modes] = await Promise.all([getStorefrontSettings(), getCurrentUser(), listGameModes()]);
  return (
    <CartProvider>
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Navbar
        storeName={settings.branding.storeName}
        logoUrl={settings.branding.logoUrl}
        serverIp={settings.server.javaAddress}
        discordUrl={settings.community.discordInviteUrl}
        user={user}
        modes={modes.map((m) => ({ name: m.name, slug: m.slug }))}
      />
      <main id="main" className="flex-1 animate-fade-in">
        {children}
      </main>
      <Footer settings={settings} />
      <CartDrawer loggedIn={Boolean(user)} />
    </div>
    </CartProvider>
  );
}
