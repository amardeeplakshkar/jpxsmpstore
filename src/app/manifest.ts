import type { MetadataRoute } from "next";
import { getSetting } from "lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getSetting("branding");
  return {
    name: `${branding.storeName} Store`,
    short_name: branding.storeName,
    description: branding.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#07090e",
    theme_color: "#07090e",
    icons: branding.logoUrl ? [{ src: branding.logoUrl, sizes: "any" }] : [],
  };
}
