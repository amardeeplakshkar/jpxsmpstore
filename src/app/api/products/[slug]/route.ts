import { fail, ok, route } from "lib/api";
import { getProductBySlug } from "lib/products/queries";

export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return fail(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return ok({
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    shortDescription: p.shortDescription,
    description: p.description,
    imageUrl: p.imageUrl,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    regularPricePaise: p.regularPricePaise,
    salePricePaise: p.salePricePaise,
    javaAvailable: p.javaAvailable,
    bedrockAvailable: p.bedrockAvailable,
    metadata: p.metadata,
    category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
  });
});
