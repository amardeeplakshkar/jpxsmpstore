"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "components/ui/button";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? <X /> : <Menu />}
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-border bg-background/95 p-4 backdrop-blur-lg">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 font-medium hover:bg-elevated">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/orders" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 font-medium hover:bg-elevated">
                My orders
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
