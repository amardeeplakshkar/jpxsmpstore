import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Clock, Coins, Gift, ShoppingCart } from "lucide-react";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { Price } from "components/products/price";
import { TYPE_META } from "components/products/product-card";
import { RichText } from "components/store/rich-text";
import { getProductBySlug } from "lib/products/queries";
import { parseMetadata, type CoinsMetadata, type CrateMetadata, type CustomMetadata, type RankMetadata } from "lib/validation/product";
import { getCurrentUser } from "lib/auth/session";

const RARITY: Record<string, string> = {
  COMMON: "text-zinc-300",
  UNCOMMON: "text-green-300",
  RARE: "text-cyan-300",
  EPIC: "text-violet-300",
  LEGENDARY: "text-amber-300",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return { title: p?.name ?? "Product", description: p?.shortDescription };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, user] = await Promise.all([getProductBySlug(slug), getCurrentUser()]);
  if (!product) notFound();
  const meta = parseMetadata(product.type, product.metadata);
  const Icon = TYPE_META[product.type].icon;
  const checkoutPath = `/checkout/${product.slug}`;
  const buyHref = user ? checkoutPath : `/api/auth/discord?returnTo=${encodeURIComponent(checkoutPath)}`;
  const gallery = product.images;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground">Store</Link> /{" "}
        <Link href={`/${product.type === "RANK" ? "ranks" : product.type === "CRATE" ? "crates" : product.type === "COINS" ? "coins" : "shop"}`} className="hover:text-foreground">
          {TYPE_META[product.type].label}s
        </Link>{" "}
        / <span className="text-foreground">{product.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/25 via-surface to-secondary/10 bg-blocks">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-10" />
            ) : (
              <Icon className="size-32 text-white/70" aria-hidden />
            )}
          </div>
          {gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.url} alt={img.alt ?? ""} className="aspect-square rounded-lg border border-border bg-surface object-contain p-2" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{TYPE_META[product.type].label}</Badge>
              {product.category && <Badge variant="muted">{product.category.name}</Badge>}
              {product.javaAvailable && <Badge variant="secondary">Java</Badge>}
              {product.bedrockAvailable && <Badge>Bedrock</Badge>}
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{product.name}</h1>
            {product.shortDescription && <p className="text-lg text-muted">{product.shortDescription}</p>}
            <Price regularPricePaise={product.regularPricePaise} salePricePaise={product.salePricePaise} className="[&>span:first-child]:text-3xl" />
          </div>

          <Button asChild size="lg" variant="gold" className="w-full sm:w-auto">
            <a href={buyHref}>
              <ShoppingCart /> Buy now
            </a>
          </Button>
          {!user && <p className="text-xs text-muted">You&apos;ll be asked to log in with Discord before checkout.</p>}

          {product.type === "RANK" && <RankDetails meta={meta as RankMetadata} />}
          {product.type === "CRATE" && <CrateDetails meta={meta as CrateMetadata} />}
          {product.type === "COINS" && <CoinDetails meta={meta as CoinsMetadata} />}
          {product.type === "CUSTOM" && <CustomDetails meta={meta as CustomMetadata} />}

          {product.description && (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 font-semibold">Details</h2>
              <RichText text={product.description} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function RankDetails({ meta }: { meta: RankMetadata }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Rank perks</h2>
        <span className="inline-flex items-center gap-1.5 text-sm text-secondary">
          <Clock className="size-4" /> {meta.durationDays ? `${meta.durationDays} days` : "Lifetime"}
        </span>
      </div>
      {meta.perks.length === 0 ? (
        <p className="text-sm text-muted">Perk details coming soon.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {meta.perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-success" /> {perk}
            </li>
          ))}
        </ul>
      )}
      {meta.kits.length > 0 && <p className="mt-3 text-sm text-muted">Kits: {meta.kits.join(", ")}</p>}
    </section>
  );
}

function CrateDetails({ meta }: { meta: CrateMetadata }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Possible rewards</h2>
        <span className="inline-flex items-center gap-1.5 text-sm text-secondary">
          <Gift className="size-4" /> {meta.keys} key{meta.keys > 1 ? "s" : ""}
        </span>
      </div>
      {meta.contents && <p className="mb-3 whitespace-pre-line text-sm text-muted">{meta.contents}</p>}
      {meta.rewards.length > 0 && (
        <ul className="divide-y divide-border">
          {meta.rewards.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span>
                {r.quantity > 1 && <span className="text-muted">{r.quantity}x </span>}
                {r.name}
              </span>
              <span className={`text-xs font-semibold ${RARITY[r.rarity]}`}>
                {r.rarity}
                {r.chance !== undefined && ` · ${r.chance}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CoinDetails({ meta }: { meta: CoinsMetadata }) {
  return (
    <section className="flex items-center gap-4 rounded-xl border border-accent/40 bg-accent/5 p-5">
      <Coins className="size-10 text-accent" />
      <div>
        <p className="text-2xl font-black text-accent">{meta.amount.toLocaleString("en-IN")} coins</p>
        {meta.bonus > 0 && <p className="text-sm text-muted">+ {meta.bonus.toLocaleString("en-IN")} bonus coins</p>}
      </div>
    </section>
  );
}

function CustomDetails({ meta }: { meta: CustomMetadata }) {
  if (meta.details.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <dl className="divide-y divide-border">
        {meta.details.map((d, i) => (
          <div key={i} className="flex justify-between gap-4 py-2 text-sm">
            <dt className="text-muted">{d.label}</dt>
            <dd className="text-right">{d.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
