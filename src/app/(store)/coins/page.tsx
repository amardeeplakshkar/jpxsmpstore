import { socialMeta } from "lib/seo";
import { CategoryPage } from "components/store/category-page";

export const metadata = {
  title: "Minecraft Coins",
  description: "Buy in-game coin packs for JPXSMP. Delivered to your Minecraft account after UPI payment.",
  alternates: { canonical: "/coins" },
  ...socialMeta("/coins"),
};

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="COINS" title="Coins" subtitle="Top up your in-game balance." basePath="/coins" categorySlug={category} />;
}
