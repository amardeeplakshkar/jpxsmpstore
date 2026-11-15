import Link from "next/link";
import { Coins, Crown, Gift, Package, Star } from "lucide-react";
import { Badge } from "components/ui/badge";
import { buttonVariants } from "components/ui/button";
import { Price } from "components/products/price";
import type { ProductType } from "db/schema";
import { cn, effectivePricePaise } from "lib/utils";

export type ProductCardData = {
  name: string;
  slug: string;
  type: ProductType;
  shortDescription: string;
  imageUrl: string | null;
  regularPricePaise: number;
  salePricePaise: number | null;
  javaAvailable: boolean;
  bedrockAvailable: boolean;
  isFeatured: boolean;
};

export const TYPE_META: Record<ProductType, { label: string; icon: typeof Crown; accent: string }> = {
  RANK: { label: "Rank", icon: Crown, accent: "from-violet-600/40" },
  CRATE: { label: "Crate", icon: Gift, accent: "from-cyan-500/30" },
  COINS: { label: "Coins", icon: Coins, accent: "from-amber-400/30" },
  CUSTOM: { label: "Item", icon: Package, accent: "from-fuchsia-500/30" },
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const meta = TYPE_META[product.type];
  const Icon = meta.icon;
  const onSale = effectivePricePaise(product) < product.regularPricePaise;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow">
      <Link href={`/product/${product.slug}`} className="absolute inset-0 z-10" aria-label={`View ${product.name}`} />
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br to-transparent bg-blocks", meta.accent)}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center">
            <Icon className="size-16 text-white/70 drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]" aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant="muted" className="bg-background/70 backdrop-blur">{meta.label}</Badge>
          {product.isFeatured && (
            <Badge variant="gold" className="bg-background/70 backdrop-blur">
              <Star className="size-3" /> Featured
            </Badge>
          )}
        </div>
        {onSale && <Badge variant="danger" className="absolute right-3 top-3 bg-background/70">Sale</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-bold">{product.name}</h3>
          {product.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-muted">{product.shortDescription}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.javaAvailable && <Badge variant="secondary">Java</Badge>}
          {product.bedrockAvailable && <Badge variant="default">Bedrock</Badge>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <Price regularPricePaise={product.regularPricePaise} salePricePaise={product.salePricePaise} />
          <span className={cn(buttonVariants({ size: "sm" }), "relative z-20 pointer-events-none")}>View</span>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
