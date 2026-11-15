import { ModePage } from "components/store/mode-page";
import { getGameModeBySlug } from "lib/products/queries";

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const m = await getGameModeBySlug((await params).mode);
  return { title: m ? `${m.name} Store` : "Not found", description: m?.description };
}

export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  return <ModePage modeSlug={(await params).mode} />;
}
