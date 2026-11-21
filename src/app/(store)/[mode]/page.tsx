import { ModePage } from "components/store/mode-page";
import { getGameModeBySlug } from "lib/products/queries";

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const m = await getGameModeBySlug((await params).mode);
  return { title: m ? `${m.name} Store` : "Not found", description: m?.description };
}

// Served from the CDN cache and refreshed in the background; admin edits revalidate it immediately.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  return <ModePage modeSlug={(await params).mode} />;
}
