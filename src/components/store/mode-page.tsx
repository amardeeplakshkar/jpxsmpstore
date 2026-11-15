import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid, TYPE_META } from "components/products/product-card";
import { DiscountBanner } from "components/store/discount-banner";
import { EmptyState } from "components/ui/empty-state";
import type { ProductType } from "db/schema";
import { getGameModeBySlug, getStoreDiscount, listProducts, toCardData } from "lib/products/queries";

const SECTION_TO_TYPE: Record<string, ProductType> = { ranks: "RANK", crates: "CRATE", coins: "COINS", items: "CUSTOM" };

/** Store page for one game mode: /survival, /survival/crates, /pvp/ranks ... */
export async function ModePage({ modeSlug, section }: { modeSlug: string; section?: string }) {
  const mode = await getGameModeBySlug(modeSlug);
  if (!mode) notFound();
  const types = (["RANK", "CRATE", "COINS", "CUSTOM"] as ProductType[]).filter((t) => mode.allowedTypes.includes(t));
  if (types.length === 0) notFound();
  const type = section ? SECTION_TO_TYPE[section] : types[0];
  if (!type || !types.includes(type)) notFound();
  const [products, discount] = await Promise.all([listProducts({ gameModeId: mode.id, type }), getStoreDiscount()]);
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:py-16" style={{ ["--mode" as string]: mode.accentColor }}>
      <DiscountBanner discount={discount} className="mb-10" />
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          {mode.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mode.iconUrl} alt="" className="size-16 rounded-2xl object-cover shadow-[0_0_25px_color-mix(in_srgb,var(--mode)_40%,transparent)]" />
          )}
          <div>
            <p className="eyebrow" style={{ color: mode.accentColor }}>Game mode</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{mode.name} Store</h1>
            {mode.description && <p className="mt-2 max-w-xl font-semibold text-muted">{mode.description}</p>}
          </div>
        </div>
        <nav aria-label={`${mode.name} sections`} className="flex flex-wrap gap-3">
          {types.map((t) => (
            <Link key={t} href={`/${mode.slug}/${TYPE_META[t].section}`} className="tab-pill" data-active={t === type}>
              {TYPE_META[t].plural}
            </Link>
          ))}
        </nav>
      </header>
      {products.length === 0 ? (
        <EmptyState title={`No ${TYPE_META[type].plural.toLowerCase()} yet`} description={`${mode.name} ${TYPE_META[type].plural.toLowerCase()} will appear here once the team adds them.`} />
      ) : (
        <ProductGrid products={products.map((p) => toCardData(p, discount))} />
      )}
    </div>
  );
}
