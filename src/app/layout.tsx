import type { Metadata, Viewport } from "next";
import { Toaster } from "components/ui/toaster";
import { getSetting } from "lib/settings";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "swap", variable: "--font-inter" });

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
