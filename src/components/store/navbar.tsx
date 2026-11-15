import Link from "next/link";
import { Brand } from "components/store/brand";
import { UserMenu } from "components/store/user-menu";
import { MobileNav } from "components/store/mobile-nav";
import type { SessionUser } from "lib/auth/session";
import { discordAvatarUrl } from "lib/utils";

export const STORE_LINKS = [
  { href: "/ranks", label: "Ranks" },
  { href: "/crates", label: "Crates" },
  { href: "/coins", label: "Coins" },
  { href: "/shop", label: "More" },
];

export function Navbar({ storeName, logoUrl, user }: { storeName: string; logoUrl: string; user: SessionUser | null }) {
  const menuUser = user
    ? {
        name: user.globalName ?? user.username,
        avatar: discordAvatarUrl(user.discordId, user.avatar, 64),
        isAdmin: Boolean(user.adminRole),
      }
    : null;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
        <Brand name={storeName} logoUrl={logoUrl} />
        <ul className="hidden items-center gap-1 md:flex">
          {STORE_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <UserMenu user={menuUser} />
          <MobileNav links={STORE_LINKS} />
        </div>
      </nav>
    </header>
  );
}
