import { ModePage } from "components/store/mode-page";
import { getGameModeBySlug } from "lib/products/queries";

export async function generateMetadata({ params }: { params: Promise<{ mode: string; section: string }> }) {
  const { mode, section } = await params;
  const m = await getGameModeBySlug(mode);
  return { title: m ? `${m.name} ${section.charAt(0).toUpperCase()}${section.slice(1)}` : "Not found" };
}

export default async function Page({ params }: { params: Promise<{ mode: string; section: string }> }) {
  const { mode, section } = await params;
  return <ModePage modeSlug={mode} section={section} />;
}
