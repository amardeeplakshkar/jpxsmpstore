import { CategoryPage } from "components/store/category-page";

export const metadata = { title: "Ranks" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="RANK" title="Ranks" subtitle="Permanent and timed ranks with exclusive perks." basePath="/ranks" categorySlug={category} />;
}
