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

export const viewport: Viewport = { themeColor: "#07090e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
