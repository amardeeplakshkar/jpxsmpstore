import { CategoryPage } from "components/store/category-page";

export const metadata = { title: "Crates" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="CRATE" title="Crates" subtitle="Crate keys packed with rewards." basePath="/crates" categorySlug={category} />;
}
