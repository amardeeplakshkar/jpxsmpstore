import type { Metadata, Viewport } from "next";
import { Toaster } from "components/ui/toaster";
import { getSetting } from "lib/settings";
import { absoluteUrl, metaDescription, siteUrl } from "lib/seo";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "swap", variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const [branding, homepage] = await Promise.all([getSetting("branding"), getSetting("homepage")]);
  const base = siteUrl();
  const description = metaDescription(branding.tagline, homepage.heroDescription);
  const image = absoluteUrl(homepage.heroBannerUrl) ?? absoluteUrl(branding.logoUrl);
  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { default: `${branding.storeName} Store - Minecraft Ranks, Crates & Coins`, template: `%s | ${branding.storeName}` },
    description,
    applicationName: branding.storeName,
    keywords: [branding.storeName, `${branding.storeName} store`, "Minecraft server store", "Minecraft ranks", "Minecraft crates", "Minecraft coins", "Java", "Bedrock", "UPI"],
    alternates: { canonical: "/" },
    icons: branding.logoUrl ? [{ url: branding.logoUrl }] : undefined,
    openGraph: {
      type: "website",
      siteName: branding.storeName,
      locale: "en_IN",
      url: "/",
      title: branding.storeName,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: branding.storeName, description, images: image ? [image] : undefined },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    formatDetection: { telephone: false },
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
