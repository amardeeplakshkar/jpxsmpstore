import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Announcements } from "components/store/announcements";
import { DiscordIcon } from "components/store/discord-icon";
import { RichText } from "components/store/rich-text";
import { SectionHeading } from "components/store/section-heading";
import { ServerStatusWidget } from "components/store/server-status";
import { ProductGrid } from "components/products/product-card";
import { Button } from "components/ui/button";
import { EmptyState } from "components/ui/empty-state";
import { listActiveAnnouncements, listProducts } from "lib/products/queries";
import { getServerStatus } from "lib/server-status";
import { getStorefrontSettings } from "lib/settings";

export default async function HomePage() {
  const [settings, featuredRanks, featuredCrates, featured, announcements, status] = await Promise.all([
    getStorefrontSettings(),
    listProducts({ type: "RANK", featured: true, limit: 6 }),
    listProducts({ type: "CRATE", featured: true, limit: 6 }),
    listProducts({ featured: true, limit: 6 }),
    listActiveAnnouncements(),
    getServerStatus(),
  ]);
  const { homepage, server, community, branding } = settings;
  const featuredOther = featured.filter((p) => p.type !== "RANK" && p.type !== "CRATE");
  const nothingFeatured = featuredRanks.length + featuredCrates.length + featuredOther.length === 0;

  return (
    <div className="space-y-20 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-blocks" aria-hidden />
        {homepage.heroBannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={homepage.heroBannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background/60 to-background" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:py-28">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
              <Zap className="size-3.5" /> {branding.storeName}
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient">{homepage.heroTitle}</span>
            </h1>
            <p className="max-w-xl text-lg text-muted">{homepage.heroDescription}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/ranks">
                  Browse ranks <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/crates">View crates</Link>
              </Button>
              {community.discordInviteUrl && (
                <Button asChild size="lg" variant="ghost">
                  <a href={community.discordInviteUrl} target="_blank" rel="noopener noreferrer">
                    <DiscordIcon /> Discord
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ServerStatusWidget status={status} javaAddress={server.javaAddress} bedrockAddress={server.bedrockAddress} bedrockPort={server.bedrockPort} />
          </div>
        </div>
      </section>

      <Announcements items={announcements} />

      {(homepage.introBody || server.serverInfo) && (
        <section className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{homepage.introTitle}</h2>
            {homepage.introBody && <RichText text={homepage.introBody} />}
          </div>
          {server.serverInfo && (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="mb-3 font-semibold">Server information</h3>
              {server.supportedVersions && <p className="mb-2 text-sm text-secondary">Versions: {server.supportedVersions}</p>}
              <RichText text={server.serverInfo} />
            </div>
          )}
        </section>
      )}

      {featuredRanks.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="Featured ranks" subtitle="Stand out with exclusive perks." href="/ranks" />
          <ProductGrid products={featuredRanks} />
        </section>
      )}
      {featuredCrates.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="Featured crates" subtitle="Try your luck for rare rewards." href="/crates" />
          <ProductGrid products={featuredCrates} />
        </section>
      )}
      {featuredOther.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="Featured products" href="/shop" />
          <ProductGrid products={featuredOther} />
        </section>
      )}
      {nothingFeatured && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <EmptyState title="The store is being stocked" description="Products will appear here once the team adds them. Check back soon." />
        </section>
      )}

      {homepage.howToPurchase.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="How to purchase" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {homepage.howToPurchase.map((step, i) => (
              <li key={i} className="rounded-xl border border-border bg-surface p-5">
                <span className="mb-3 grid size-9 place-items-center rounded-lg bg-primary/20 font-bold text-violet-300">{i + 1}</span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <ShieldCheck className="size-4 text-success" /> Payments are verified by our team. We never ask for your Minecraft password.
          </p>
        </section>
      )}

      {community.discordInviteUrl && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/25 via-surface to-secondary/10 p-8 sm:flex-row">
            <div>
              <h2 className="text-2xl font-bold">Join the community</h2>
              <p className="text-muted">Get support, event news and giveaways on our Discord server.</p>
            </div>
            <Button asChild size="lg">
              <a href={community.discordInviteUrl} target="_blank" rel="noopener noreferrer">
                <DiscordIcon /> Join Discord
              </a>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
