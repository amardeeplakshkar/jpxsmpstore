import { Navbar } from "components/store/navbar";
import { Footer } from "components/store/footer";
import { SessionProvider } from "components/auth/session-provider";
import { getStorefrontSettings } from "lib/settings";
import { listGameModes } from "lib/products/queries";
import { CartProvider } from "components/cart/cart-provider";
import { CartDrawer } from "components/cart/cart-drawer";

// No force-dynamic and no cookie reads here: the shell is cacheable, so store pages can be served
// from Vercel's CDN. The signed-in user is loaded in the browser by SessionProvider.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, modes] = await Promise.all([getStorefrontSettings(), listGameModes()]);
  return (
    <SessionProvider>
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
        modes={modes.map((m) => ({ name: m.name, slug: m.slug }))}
      />
      <main id="main" className="flex-1 animate-fade-in">
        {children}
      </main>
      <Footer settings={settings} />
      <CartDrawer />
    </div>
    </CartProvider>
    </SessionProvider>
  );
}
