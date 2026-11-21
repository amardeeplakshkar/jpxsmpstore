"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { IpCopy } from "components/store/ip-copy";
import { DiscordIcon } from "components/store/discord-icon";
import { cn } from "lib/utils";

export function MobileNav({ links, serverIp, discordUrl }: { links: { href: string; label: string }[]; serverIp?: string; discordUrl?: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname() || "/";
  const items = [...links, ...(links.some((l) => l.href === "/orders") ? [] : [{ href: "/orders", label: "My orders" }])];

  // Close on navigation (incl. back/forward) and on Escape.
  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // stop the page scrolling behind the menu
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-white/5 text-white shadow-[0_4px_0_rgb(0_0_0/0.5)] transition hover:bg-primary hover:text-black sm:size-11"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <>
          {/* Backdrop: tap outside the menu to close it. */}
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/60 backdrop-blur-sm sm:top-[76px]" />
          <div id="mobile-menu" className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-[rgb(7_9_14/0.98)] p-3 shadow-[0_20px_40px_rgb(0_0_0/0.6)] sm:max-h-[calc(100dvh-76px)] sm:p-4">
            <ul className="space-y-1">
              {items.map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-xl px-4 py-3.5 text-sm font-extrabold uppercase tracking-wider transition",
                        active ? "bg-primary/15 text-white" : "text-muted hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {(serverIp || discordUrl) && (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
                {serverIp && <IpCopy address={serverIp} className="w-full justify-center sm:flex-1" />}
                {discordUrl && (
                  <Link href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn3d btn3d-discord h-11 w-full px-5 text-[13px] sm:flex-1">
                    <DiscordIcon /> Discord
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
