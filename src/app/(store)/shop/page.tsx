import { CategoryPage } from "components/store/category-page";

export const metadata = { title: "More items" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="CUSTOM" title="More items" subtitle="Other items and bundles." basePath="/shop" categorySlug={category} />;
}
