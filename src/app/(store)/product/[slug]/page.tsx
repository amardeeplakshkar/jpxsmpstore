import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, CircleCheck, Clock, Coins, Gift, Headset, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "components/ui/badge";
import { TYPE_META, cardStyle } from "components/products/product-card";
import { formatINR } from "lib/utils";
import { RichText } from "components/store/rich-text";
import { getProductBySlug, getStoreDiscount } from "lib/products/queries";
import { priceProduct } from "lib/pricing";
import { maxQtyFor } from "lib/cart";
import { ProductPurchase } from "components/cart/product-purchase";
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
  const gallery = product.images;

  const discount = await getStoreDiscount();
  const pb = priceProduct(product, discount);
  const price = pb.unitPaise;
  const onSale = pb.savedPaise > 0;
  const pct = pb.percentOff;
  const mode = product.gameMode && !product.gameMode.deletedAt && product.gameMode.isActive ? product.gameMode : null;
  const listHref = mode
    ? `/${mode.slug}/${TYPE_META[product.type].section}`
    : `/${product.type === "RANK" ? "ranks" : product.type === "CRATE" ? "crates" : product.type === "COINS" ? "coins" : "shop"}`;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 pb-24" style={cardStyle(product.type)}>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm font-bold text-muted">
        <Link href="/" className="hover:text-white">Store</Link> /{" "}
        {mode && (
          <>
            <Link href={`/${mode.slug}`} className="hover:text-white">{mode.name}</Link> /{" "}
          </>
        )}
        <Link href={listHref} className="hover:text-white">{TYPE_META[product.type].plural}</Link> /{" "}
        <span className="text-white">{product.name}</span>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_420px] lg:gap-10">
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-surface shadow-[0_20px_40px_rgb(0_0_0/0.4)]">
          <div className="pp-hero flex flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:px-10 sm:py-12 sm:text-left">
            <div className="relative z-10 grid size-[110px] shrink-0 place-items-center overflow-hidden rounded-3xl border-2 bg-black/40" style={{ borderColor: "color-mix(in srgb, var(--card) 50%, transparent)", boxShadow: "0 10px 30px color-mix(in srgb, var(--card) 30%, transparent)" }}>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-2" />
              ) : (
                <Icon className="size-14" style={{ color: "var(--card)" }} aria-hidden />
              )}
            </div>
            <div className="relative z-10">
              <div className="mb-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="rounded-full border px-3 py-1.5 text-[11px] font-black uppercase" style={{ color: "var(--card)", borderColor: "color-mix(in srgb, var(--card) 40%, transparent)", background: "color-mix(in srgb, var(--card) 20%, transparent)" }}>
                  {product.category?.name ?? TYPE_META[product.type].label}
                </span>
                {mode && <Badge variant="muted" style={{ color: mode.accentColor }}>{mode.name}</Badge>}
                {product.javaAvailable && <Badge variant="muted">Java</Badge>}
                {product.bedrockAvailable && <Badge variant="muted">Bedrock</Badge>}
              </div>
              <h1 className="mb-3 text-[32px] font-black uppercase leading-none tracking-tight text-white sm:text-[46px]">{product.name}</h1>
              {product.shortDescription && <p className="font-medium leading-relaxed text-slate-300">{product.shortDescription}</p>}
            </div>
          </div>
          <div className="space-y-8 p-6 sm:p-10">
            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {gallery.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={img.url} alt={img.alt ?? ""} className="aspect-square rounded-xl border border-white/10 bg-elevated object-contain p-2" />
                ))}
              </div>
            )}
            {product.type === "RANK" && <RankDetails meta={meta as RankMetadata} />}
            {product.type === "CRATE" && <CrateDetails meta={meta as CrateMetadata} />}
            {product.type === "COINS" && <CoinDetails meta={meta as CoinsMetadata} />}
            {product.type === "CUSTOM" && <CustomDetails meta={meta as CustomMetadata} />}
            {product.description && (
              <section>
                <h2 className="mb-5 text-[22px] font-black text-white">Details</h2>
                <RichText text={product.description} />
              </section>
            )}
          </div>
        </div>

        <aside className="buy-box p-7 sm:p-10 lg:sticky lg:top-[110px]" aria-label="Purchase">
          <div className="mb-7 border-b border-dashed border-white/10 pb-6">
            <div className="mb-2 flex items-center gap-4">
              <span className="text-[54px] font-black leading-none tracking-[-2px] text-white">{formatINR(price)}</span>
              {onSale && (
                <span className="flex flex-col items-start gap-1">
                  <span className="text-[22px] font-bold text-slate-500 line-through">{formatINR(product.regularPricePaise)}</span>
                  <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-black text-black">{pct}% OFF</span>
                </span>
              )}
            </div>
            {onSale && (
              <p className="mb-2 text-sm font-black text-emerald-400">
                You save {formatINR(pb.savedPaise)}
                {pb.source === "store" && discount ? ` · ${discount.label}` : ""}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <CircleCheck className="size-4" /> Available now
            </p>
          </div>
          <ProductPurchase slug={product.slug} maxQty={maxQtyFor(product)} unitPaise={price} loggedIn={Boolean(user)} />
          {!user && <p className="mb-6 text-center text-xs font-semibold text-muted">You&apos;ll log in with Discord before checkout.</p>}
          <div className="mt-6 flex justify-between border-t border-white/5 pt-5">
            {[
              { icon: Lock, label: "Secure UPI" },
              { icon: ShieldCheck, label: "Verified" },
              { icon: Headset, label: "Support" },
            ].map(({ icon: I, label }) => (
              <div key={label} className="text-center text-[11px] font-bold uppercase text-slate-500">
                <I className="mx-auto mb-2 size-5 text-white" aria-hidden />
                {label}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function RankDetails({ meta }: { meta: RankMetadata }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[22px] font-black text-white">Rank perks</h2>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--card)]">
          <Clock className="size-4" /> {meta.durationDays ? `${meta.durationDays} days` : "Lifetime"}
        </span>
      </div>
      {meta.perks.length === 0 ? (
        <p className="text-sm text-muted">Perk details coming soon.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {meta.perks.map((perk, i) => (
            <li key={i} className="feature-card flex items-start gap-3 text-sm font-bold text-white">
              <Check className="mt-0.5 size-5 shrink-0 text-[color:var(--card)]" /> {perk}
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
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[22px] font-black text-white">Possible rewards</h2>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--card)]">
          <Gift className="size-4" /> {meta.keys} key{meta.keys > 1 ? "s" : ""}
        </span>
      </div>
      {meta.contents && <p className="mb-3 whitespace-pre-line text-sm text-muted">{meta.contents}</p>}
      {meta.rewards.length > 0 && (
        <ul className="grid gap-3">
          {meta.rewards.map((r, i) => (
            <li key={i} className="feature-card flex items-center justify-between text-sm font-bold">
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
    <section className="feature-card flex items-center gap-5 p-6">
      <Coins className="size-12 text-[color:var(--card)]" />
      <div>
        <p className="text-3xl font-black text-white">{meta.amount.toLocaleString("en-IN")} coins</p>
        {meta.bonus > 0 && <p className="text-sm text-muted">+ {meta.bonus.toLocaleString("en-IN")} bonus coins</p>}
      </div>
    </section>
  );
}

function CustomDetails({ meta }: { meta: CustomMetadata }) {
  if (meta.details.length === 0) return null;
  return (
    <section>
      <dl className="grid gap-3">
        {meta.details.map((d, i) => (
          <div key={i} className="feature-card flex justify-between gap-4 text-sm font-bold">
            <dt className="text-muted">{d.label}</dt>
            <dd className="text-right">{d.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
