import Link from "next/link";
import { Check, Coins, Crown, Gift, Package, Star } from "lucide-react";
import { AddToCartButton } from "components/cart/add-to-cart-button";
import type { ProductType } from "db/schema";
import { maxQtyFor } from "lib/cart";
import { formatINR } from "lib/utils";

export type ProductCardData = {
  name: string;
  slug: string;
  type: ProductType;
  shortDescription: string;
  imageUrl: string | null;
  regularPricePaise: number;
  unitPricePaise: number;
  savedPaise: number;
  percentOff: number;
  javaAvailable: boolean;
  bedrockAvailable: boolean;
  isFeatured: boolean;
  /** Max quantity per order (1 = no quantity picker). */
  maxQty?: number;
  gameMode: { name: string; slug: string; color: string } | null;
  perks: string[];
};

/** Per-type card colour (top bar, title, glow) following the JpxSMP package-card design. */
export const TYPE_META: Record<ProductType, { label: string; plural: string; section: string; icon: typeof Crown; color: string }> = {
  RANK: { label: "Rank", plural: "Ranks", section: "ranks", icon: Crown, color: "#a855f7" },
  CRATE: { label: "Crate", plural: "Crates", section: "crates", icon: Gift, color: "#f59e0b" },
  COINS: { label: "Coins", plural: "Coins", section: "coins", icon: Coins, color: "#eab308" },
  CUSTOM: { label: "Item", plural: "Items", section: "items", icon: Package, color: "#22d3ee" },
};

export function cardStyle(type: ProductType): React.CSSProperties {
  const c = TYPE_META[type].color;
  return { ["--card" as string]: c, ["--card-glow" as string]: `color-mix(in srgb, ${c} 30%, transparent)` };
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const meta = TYPE_META[product.type];
  const Icon = meta.icon;
  const onSale = product.savedPaise > 0;
  const editions = [product.javaAvailable && "Java Edition", product.bedrockAvailable && "Bedrock Edition"].filter(Boolean) as string[];
  const bullets = [...product.perks, ...(product.perks.length ? [] : product.shortDescription ? [product.shortDescription] : []), ...editions].slice(0, 5);
  return (
    <article className="package-card group" style={cardStyle(product.type)}>
      <Link href={`/product/${product.slug}`} className="absolute inset-0 z-10" aria-label={`View ${product.name}`} />
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="grid size-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1.5 transition group-hover:scale-110" loading="lazy" />
          ) : (
            <Icon className="size-8" style={{ color: meta.color }} aria-hidden />
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {product.gameMode && (
            <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase" style={{ color: product.gameMode.color, borderColor: `${product.gameMode.color}66`, background: `${product.gameMode.color}1a` }}>
              {product.gameMode.name}
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-300">
              <Star className="size-3" /> Featured
            </span>
          )}
        </div>
      </div>
      <h3 className="mb-2 text-[26px] font-black uppercase leading-tight tracking-tight" style={{ color: meta.color }}>
        {product.name}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[38px] font-black tracking-tight text-white">{formatINR(product.unitPricePaise)}</span>
        {onSale && <span className="rounded-lg bg-red-500 px-2 py-1 text-xs font-black text-black">-{product.percentOff}%</span>}
      </div>
      <p className="mb-6 text-sm font-bold text-muted">
        {onSale ? (
          <>
            <span className="line-through">{formatINR(product.regularPricePaise)}</span> <span className="text-emerald-400">· Save {formatINR(product.savedPaise)}</span>
          </>
        ) : (
          meta.label
        )}
      </p>
      <ul className="mb-8 flex-1 space-y-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm font-semibold text-slate-300">
            <Check className="mt-0.5 size-4 shrink-0" style={{ color: meta.color }} /> <span className="line-clamp-2">{b}</span>
          </li>
        ))}
      </ul>
      <div className="relative z-20 grid grid-cols-[1fr_auto] gap-3">
        <Link href={`/product/${product.slug}`} className="btn3d btn3d-accent h-12 text-sm">View</Link>
        <AddToCartButton slug={product.slug} maxQty={product.maxQty ?? maxQtyFor(product.type)} label="" className="h-12 w-14 px-0" />
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid gap-7 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
