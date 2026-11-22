import { socialMeta } from "lib/seo";
import { CategoryPage } from "components/store/category-page";

export const metadata = {
  title: "Minecraft Ranks",
  description: "Buy Minecraft ranks for JPXSMP: permanent and timed ranks with kits, homes, vaults and exclusive perks. Instant UPI checkout.",
  alternates: { canonical: "/ranks" },
  ...socialMeta("/ranks"),
};

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="RANK" title="Ranks" subtitle="Permanent and timed ranks with exclusive perks." basePath="/ranks" categorySlug={category} />;
}
