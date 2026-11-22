import { socialMeta } from "lib/seo";
import { ModePage } from "components/store/mode-page";
import { getGameModeBySlug } from "lib/products/queries";

export async function generateMetadata({ params }: { params: Promise<{ mode: string; section: string }> }) {
  const { mode, section } = await params;
  const m = await getGameModeBySlug(mode);
  if (!m) return { title: "Not found", robots: { index: false } };
  const label = `${section.charAt(0).toUpperCase()}${section.slice(1)}`;
  return {
    title: `${m.name} ${label}`,
    description: `Buy ${m.name} ${section} on the official store. Pay with UPI, delivered in-game.`,
    alternates: { canonical: `/${mode}/${section}` },
    ...socialMeta(`/${mode}/${section}`),
  };
}

// Served from the CDN cache and refreshed in the background; admin edits revalidate it immediately.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ mode: string; section: string }> }) {
  const { mode, section } = await params;
  return <ModePage modeSlug={mode} section={section} />;
}
