import { CategoryPage } from "components/store/category-page";

export const metadata = { title: "Coins" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="COINS" title="Coins" subtitle="Top up your in-game balance." basePath="/coins" categorySlug={category} />;
}
