import Link from "next/link";
import { Brand } from "components/store/brand";
import { DiscordIcon } from "components/store/discord-icon";
import type { StorefrontSettings } from "lib/settings";

export function Footer({ settings }: { settings: StorefrontSettings }) {
  const { branding, community, legal } = settings;
  const termsHref = legal.termsUrl || "/terms";
  const privacyHref = legal.privacyUrl || "/privacy";
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <Brand name={branding.storeName} logoUrl={branding.logoUrl} />
          <p className="max-w-sm text-sm text-muted">{branding.tagline}</p>
          {community.discordInviteUrl && (
            <a href={community.discordInviteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:underline">
              <DiscordIcon /> Join our Discord
            </a>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Store</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/ranks" className="hover:text-secondary">Ranks</Link></li>
            <li><Link href="/crates" className="hover:text-secondary">Crates</Link></li>
            <li><Link href="/coins" className="hover:text-secondary">Coins</Link></li>
            <li><Link href="/orders" className="hover:text-secondary">Order history</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Legal</h2>
          <ul className="space-y-2 text-sm">
            <li><a href={termsHref} className="hover:text-secondary">Terms and conditions</a></li>
            <li><a href={privacyHref} className="hover:text-secondary">Privacy policy</a></li>
            {community.footerLinks.map((l) => (
              <li key={l.url + l.label}>
                <a href={l.url} className="hover:text-secondary" rel="noopener noreferrer">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted">
        <p>{community.footerText}</p>
        <p className="mt-1">© {new Date().getFullYear()} {branding.storeName}. All prices in INR.</p>
      </div>
    </footer>
  );
}
