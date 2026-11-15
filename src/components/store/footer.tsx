import Link from "next/link";
import { Brand } from "components/store/brand";
import { DiscordIcon } from "components/store/discord-icon";
import { SocialButtons } from "components/store/social-buttons";
import type { StorefrontSettings } from "lib/settings";

const linkCls = "text-sm font-semibold text-muted transition hover:pl-1 hover:text-primary";

export function Footer({ settings }: { settings: StorefrontSettings }) {
  const { branding, community, legal, social } = settings;
  const hasSocial = social.buttons.some((b) => b.enabled);
  const termsHref = legal.termsUrl || "/terms";
  const privacyHref = legal.privacyUrl || "/privacy";
  return (
    <footer className="mt-24 border-t border-border bg-[rgb(7_9_14/0.95)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 text-center md:grid-cols-[2fr_1fr_1fr] md:text-left">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <Brand name={branding.storeName} logoUrl={branding.logoUrl} />
          <p className="max-w-sm text-sm font-medium leading-relaxed text-muted">{branding.tagline}</p>
          {hasSocial ? (
            <div className="mt-2 space-y-4">
              <h2 className="text-base font-black uppercase tracking-wide text-white">{social.title}</h2>
              <SocialButtons buttons={social.buttons} />
            </div>
          ) : (
            community.discordInviteUrl && (
              <a href={community.discordInviteUrl} target="_blank" rel="noopener noreferrer" className="btn3d btn3d-discord h-11 px-5 text-[13px]">
                <DiscordIcon /> Join Discord
              </a>
            )
          )}
        </div>
        <div>
          <h2 className="mb-4 text-base font-black uppercase tracking-wide text-white">Store</h2>
          <ul className="space-y-3">
            <li><Link href="/ranks" className={linkCls}>Ranks</Link></li>
            <li><Link href="/crates" className={linkCls}>Crates</Link></li>
            <li><Link href="/coins" className={linkCls}>Coins</Link></li>
            <li><Link href="/orders" className={linkCls}>Order history</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-base font-black uppercase tracking-wide text-white">Legal</h2>
          <ul className="space-y-3">
            <li><a href={termsHref} className={linkCls}>Terms and conditions</a></li>
            <li><a href={privacyHref} className={linkCls}>Privacy policy</a></li>
            {community.footerLinks.map((l) => (
              <li key={l.url + l.label}>
                <a href={l.url} className={linkCls} rel="noopener noreferrer">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 border-t border-border px-5 py-6 text-xs font-semibold text-muted md:flex-row">
        <p>{community.footerText}</p>
        <p>© {new Date().getFullYear()} {branding.storeName}. All prices in INR.</p>
      </div>
    </footer>
  );
}
