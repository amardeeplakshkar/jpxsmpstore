import { socialMeta } from "lib/seo";
import { CategoryPage } from "components/store/category-page";

export const metadata = {
  title: "More items",
  description: "Custom items and extras for the JPXSMP Minecraft server, for Java and Bedrock players.",
  alternates: { canonical: "/shop" },
  ...socialMeta("/shop"),
};

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="CUSTOM" title="More items" subtitle="Other items and bundles." basePath="/shop" categorySlug={category} />;
}
