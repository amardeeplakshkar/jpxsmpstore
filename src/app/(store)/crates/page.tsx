import { CategoryPage } from "components/store/category-page";

export const metadata = {
  title: "Minecraft Crates",
  description: "Buy Minecraft crate keys for JPXSMP and win rare items, gear and rewards. Java and Bedrock, pay with UPI.",
  alternates: { canonical: "/crates" },
  openGraph: { url: "/crates" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <CategoryPage type="CRATE" title="Crates" subtitle="Crate keys packed with rewards." basePath="/crates" categorySlug={category} />;
}
