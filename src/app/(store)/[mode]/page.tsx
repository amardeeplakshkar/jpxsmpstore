import { ModePage } from "components/store/mode-page";
import { getGameModeBySlug } from "lib/products/queries";
import { metaDescription } from "lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const slug = (await params).mode;
  const m = await getGameModeBySlug(slug);
  if (!m) return { title: "Not found", robots: { index: false } };
  return {
    title: `${m.name} Store - Ranks, Crates & Coins`,
    description: metaDescription(m.description, `Shop ranks, crates and coins for the ${m.name} game mode.`),
    alternates: { canonical: `/${slug}` },
    openGraph: { url: `/${slug}` },
  };
}

// Served from the CDN cache and refreshed in the background; admin edits revalidate it immediately.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  return <ModePage modeSlug={(await params).mode} />;
}
