import Link from "next/link";
import { Brand } from "components/store/brand";
import { UserMenu } from "components/store/user-menu";
import { MobileNav } from "components/store/mobile-nav";
import { IpCopy } from "components/store/ip-copy";
import { DiscordIcon } from "components/store/discord-icon";
import { NavLinks } from "components/store/nav-links";
import { CartButton } from "components/cart/cart-button";

export const STORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/ranks", label: "Ranks" },
  { href: "/crates", label: "Crates" },
  { href: "/coins", label: "Coins" },
  { href: "/shop", label: "More" },
];

export function Navbar({ storeName, logoUrl, serverIp, discordUrl, modes = [] }: { storeName: string; logoUrl: string; serverIp: string; discordUrl: string; modes?: { name: string; slug: string }[] }) {
  const links = modes.length ? [{ href: "/", label: "Home" }, ...modes.map((m) => ({ href: `/${m.slug}`, label: m.name })), { href: "/orders", label: "Orders" }] : STORE_LINKS;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[rgb(7_9_14/0.9)] shadow-[0_10px_30px_rgb(0_0_0/0.8)] backdrop-blur-[25px]">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-3 sm:h-[76px] sm:gap-4 sm:px-6 lg:px-10" aria-label="Main">
        <div className="flex min-w-0 items-center gap-5">
          <Brand name={storeName} logoUrl={logoUrl} />
          <IpCopy address={serverIp} className="hidden xl:inline-flex" />
        </div>
        <NavLinks links={links} />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {discordUrl && (
            <Link href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn3d btn3d-discord hidden h-11 px-5 text-[13px] sm:inline-flex">
              <DiscordIcon /> <span className="hidden lg:inline">Discord</span>
            </Link>
          )}
          <CartButton />
          <UserMenu />
          <MobileNav links={links} serverIp={serverIp} discordUrl={discordUrl} />
        </div>
      </nav>
    </header>
  );
}
