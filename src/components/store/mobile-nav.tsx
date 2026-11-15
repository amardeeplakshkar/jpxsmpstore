"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full border border-border bg-white/5 text-white shadow-[0_4px_0_rgb(0_0_0/0.5)] transition hover:bg-primary hover:text-black cursor-pointer"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[76px] border-b border-border bg-[rgb(7_9_14/0.97)] p-4 backdrop-blur-xl">
          <ul className="space-y-1">
            {[...links, ...(links.some((l) => l.href === "/orders") ? [] : [{ href: "/orders", label: "My orders" }])].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-muted hover:bg-white/5 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
