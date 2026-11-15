"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  FolderTree,
  Swords,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Package,
  ScrollText,
  Settings,
  Store,
  Truck,
  Users,
  X,
} from "lucide-react";
import { cn } from "lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/game-modes", label: "Game modes", icon: Swords },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/fulfillment", label: "Fulfillment", icon: Truck },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/storefront", label: "Storefront", icon: Store },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function AdminShell({ children, storeName, admin }: { children: React.ReactNode; storeName: string; admin: { name: string; avatar: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const nav = (
    <nav aria-label="Admin" className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary/20 text-white ring-1 ring-primary/40" : "text-muted hover:bg-elevated hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-screen bg-[#07070c] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-black">A</span>
          <div className="leading-tight">
            <p className="text-sm font-bold">{storeName}</p>
            <p className="text-[11px] uppercase tracking-wider text-secondary">Admin</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
        <div className="flex items-center gap-3 border-t border-border p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={admin.avatar} alt="" className="size-8 rounded-md" />
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{admin.name}</p>
            <p className="text-[11px] text-accent">{admin.role.replace("_", " ")}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:px-8">
          <button className="rounded-md p-2 hover:bg-elevated lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <p className="hidden text-sm text-muted lg:block">Manage your store</p>
          <Link href="/" className="text-sm font-medium text-secondary hover:underline">
            View storefront
          </Link>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border bg-surface p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold">{storeName} Admin</p>
                <button aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-elevated">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
            </div>
          </div>
        )}
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
