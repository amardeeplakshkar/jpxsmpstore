import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Coins, Crown, GitBranch, Gift, ShieldCheck, Swords, Users } from "lucide-react";
import { Announcements } from "components/store/announcements";
import { DiscordIcon } from "components/store/discord-icon";
import { IpCopy } from "components/store/ip-copy";
import { LatestVideos, LatestVideosSkeleton } from "components/store/latest-videos";
import { RichText } from "components/store/rich-text";
import { SectionHeading } from "components/store/section-heading";
import { ProductGrid } from "components/products/product-card";
import { EmptyState } from "components/ui/empty-state";
import { getStoreDiscount, listActiveAnnouncements, listGameModes, listProducts, toCardData } from "lib/products/queries";
import { DiscountBanner } from "components/store/discount-banner";
import { getServerStatus } from "lib/server-status";
import { getStorefrontSettings } from "lib/settings";

const CATEGORIES = [
  { href: "/ranks", title: "Ranks", body: "Perks, kits and a shiny prefix", icon: Crown },
  { href: "/crates", title: "Crates", body: "Keys for rare rewards", icon: Gift },
  { href: "/coins", title: "Coins", body: "In-game currency packs", icon: Coins },
];

// Served from the CDN cache and refreshed in the background; admin edits revalidate it immediately.
export const revalidate = 60;

export default async function HomePage() {
  // Settings are cached, so reading them first is cheap and lets us skip the featured queries when hidden.
  const settings = await getStorefrontSettings();
  const showFeatured = settings.homepage.showFeatured !== false;
  const none = Promise.resolve([] as Awaited<ReturnType<typeof listProducts>>);
  const [featuredRanks, featuredCrates, featured, announcements, status, modes, discount] = await Promise.all([
    showFeatured ? listProducts({ type: "RANK", featured: true, limit: 6 }) : none,
    showFeatured ? listProducts({ type: "CRATE", featured: true, limit: 6 }) : none,
    showFeatured ? listProducts({ featured: true, limit: 6 }) : none,
    listActiveAnnouncements(),
    getServerStatus(),
    listGameModes(),
    getStoreDiscount(),
  ]);
  const card = (list: typeof featured) => list.map((p) => toCardData(p, discount));
  const { homepage, server, community, branding } = settings;
  const featuredOther = featured.filter((p) => p.type !== "RANK" && p.type !== "CRATE");
  const nothingFeatured = showFeatured && featuredRanks.length + featuredCrates.length + featuredOther.length === 0;

  const online = status.state === "online";
  const statusText = online ? `${status.playersOnline} Players Online` : status.state === "offline" ? "Server Offline" : "Join the adventure";
  const dot = online ? "#10b981" : status.state === "offline" ? "#ef4444" : "#a855f7";
  const editions = [server.javaAddress && "Java", server.bedrockAddress && "Bedrock"].filter(Boolean).join(" • ") || "Java • Bedrock";

  const info = [
    { icon: Users, value: online ? String(status.playersOnline) : "—", label: "Active players" },
    { icon: Boxes, value: editions, label: "Platforms supported" },
    { icon: GitBranch, value: server.supportedVersions || "Latest", label: "Version" },
    { icon: ShieldCheck, value: "Secure UPI", label: "Verified payments", accent: true },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:py-16">
      {/* Hero */}
      <section className="glass relative mb-14 flex flex-col items-center justify-between gap-10 overflow-hidden p-8 text-center sm:p-12 lg:flex-row lg:p-[60px] lg:text-left">
        {homepage.heroBannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={homepage.heroBannerUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15" />
        )}
        <div className="relative z-10 max-w-[580px]">
          <span className="status-pill mb-6" style={{ ["--dot" as string]: dot }}>
            <span className="status-dot" aria-hidden />
            {statusText}
          </span>
          <h1 className="mb-5 text-[40px] font-black leading-[1.1] tracking-[-1.5px] sm:text-[56px]">
            {homepage.heroTitle || (
              <>
                Welcome to <br /> <span className="text-glow">{branding.storeName}</span>
              </>
            )}
          </h1>
          <p className="mb-10 text-[17px] font-semibold leading-relaxed text-muted">{homepage.heroDescription}</p>
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center lg:justify-start">
            <IpCopy address={server.javaAddress} variant="button" />
            <Link href="/ranks" className="btn3d btn3d-accent h-14 px-7 text-sm">
              Browse store <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        {branding.logoUrl && (
          <div className="relative z-10 hidden size-[340px] shrink-0 overflow-hidden rounded-[28px] bg-black/30 shadow-[0_20px_50px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.05)] transition duration-500 [transform:perspective(1000px)_rotateY(-10deg)_rotateX(5deg)] hover:[transform:perspective(1000px)_translateY(-10px)] lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={branding.logoUrl} alt={`${branding.storeName} logo`} className="h-full w-full object-cover" />
          </div>
        )}
      </section>

      {/* Info cards */}
      <section className="mb-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Server information">
        {info.map(({ icon: Icon, value, label, accent }) => (
          <div key={label} className="panel lift flex flex-col gap-3 px-6 py-8">
            <Icon className="icon-glow size-7" aria-hidden />
            <div>
              <p className={`mb-1 text-[22px] font-black ${accent ? "text-primary" : "text-white"}`}>{value}</p>
              <p className="eyebrow">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <Announcements items={announcements} />

      <DiscountBanner discount={discount} className="mb-14" />

      {/* Game modes (or plain categories when no modes exist yet) */}
      <section className="mb-20">
        <SectionHeading title={modes.length ? "Select Game Mode" : "Select a Category"} href={modes.length ? undefined : "/shop"} />
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {modes.length
            ? modes.map((m) => (
                <Link key={m.id} href={`/${m.slug}`} className="category-card group" style={{ ["--mode" as string]: m.accentColor }}>
                  {m.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.iconUrl} alt="" className="size-16 rounded-2xl object-cover transition group-hover:scale-110" />
                  ) : (
                    <Swords className="size-14 transition group-hover:scale-110" style={{ color: m.accentColor, filter: `drop-shadow(0 0 10px ${m.accentColor}80)` }} aria-hidden />
                  )}
                  <h3 className="text-[26px] font-black text-white">{m.name}</h3>
                  <p className="font-semibold text-muted">{m.description || m.allowedTypes.map((t) => ({ RANK: "Ranks", CRATE: "Crate keys", COINS: "Coins", CUSTOM: "Items" })[t as "RANK"]).join(" & ")}</p>
                </Link>
              ))
            : CATEGORIES.map(({ href, title, body, icon: Icon }) => (
                <Link key={href} href={href} className="category-card group">
                  <Icon className="icon-glow size-14 transition group-hover:scale-110" aria-hidden />
                  <h3 className="text-[26px] font-black text-white">{title}</h3>
                  <p className="font-semibold text-muted">{body}</p>
                </Link>
              ))}
        </div>
      </section>

      {(homepage.introBody || server.serverInfo) && (
        <section className="mb-20 grid gap-7 lg:grid-cols-2">
          {homepage.introBody && (
            <div className="panel p-8">
              <h2 className="mb-4 text-2xl font-black">{homepage.introTitle}</h2>
              <RichText text={homepage.introBody} />
            </div>
          )}
          {server.serverInfo && (
            <div className="panel p-8">
              <h2 className="mb-2 text-2xl font-black">Server information</h2>
              {server.supportedVersions && <p className="eyebrow mb-4 text-primary">Versions: {server.supportedVersions}</p>}
              <RichText text={server.serverInfo} />
            </div>
          )}
        </section>
      )}

      {featuredRanks.length > 0 && (
        <section className="mb-20">
          <SectionHeading title="Featured Ranks" subtitle="Stand out with exclusive perks." href="/ranks" />
          <ProductGrid products={card(featuredRanks)} />
        </section>
      )}
      {featuredCrates.length > 0 && (
        <section className="mb-20">
          <SectionHeading title="Featured Crates" subtitle="Try your luck for rare rewards." href="/crates" />
          <ProductGrid products={card(featuredCrates)} />
        </section>
      )}
      {featuredOther.length > 0 && (
        <section className="mb-20">
          <SectionHeading title="Featured Products" href="/shop" />
          <ProductGrid products={card(featuredOther)} />
        </section>
      )}
      {nothingFeatured && (
        <section className="mb-20">
          <EmptyState title="The store is being stocked" description="Products will appear here once the team adds them. Check back soon." />
        </section>
      )}

      {homepage.howToPurchase.length > 0 && (
        <section className="mb-20">
          <SectionHeading title="How to Purchase" />
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {homepage.howToPurchase.map((step, i) => (
              <li key={i} className="panel lift p-6">
                <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary text-lg font-black text-black shadow-[0_4px_0_var(--color-primary-dark)]">{i + 1}</span>
                <h3 className="text-lg font-black">{step.title}</h3>
                <p className="mt-1 text-sm font-medium text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-muted">
            <ShieldCheck className="size-4 text-primary" /> Payments are verified by our team. We never ask for your Minecraft password.
          </p>
        </section>
      )}

      {/* Streamed in so a slow video feed never delays the rest of the page. */}
      <Suspense fallback={<LatestVideosSkeleton />}>
        <LatestVideos />
      </Suspense>

      {community.discordInviteUrl && (
        <section className="glass p-10 text-center sm:p-[60px]">
          <h2 className="mb-4 text-3xl font-black tracking-tight sm:text-[42px]">Join the Community</h2>
          <p className="mb-10 text-lg font-medium text-muted">Get support, event news and giveaways on our Discord server.</p>
          <a href={community.discordInviteUrl} target="_blank" rel="noopener noreferrer" className="btn3d btn3d-discord h-14 px-8 text-sm">
            <DiscordIcon /> Join Discord
          </a>
        </section>
      )}
    </div>
  );
}
