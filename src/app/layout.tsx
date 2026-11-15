import type { Metadata, Viewport } from "next";
import { Toaster } from "components/ui/toaster";
import { getSetting } from "lib/settings";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSetting("branding");
  return {
    title: { default: branding.storeName, template: `%s | ${branding.storeName}` },
    description: branding.tagline,
    icons: branding.logoUrl ? [{ url: branding.logoUrl }] : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#09090F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
